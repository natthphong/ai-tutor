// src/pages/index.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import type { ChatMessage, TutorAction, TutorPractice, TutorTurnResponse, TutorUser } from "@/types/tutor";
import TutorHeader from "@/components/tutor/TutorHeader";
import ChatBubble from "@/components/tutor/ChatBubble";
import InputBar from "@/components/tutor/InputBar";
import BottomNav from "@/components/tutor/BottomNav";
import {
    startSession,
    getNextStep,
    submitSpeakingAudio,
    submitTutorTurn,
    synthesizeTTS,
} from "@/services/tutorApi";

function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export default function TutorPage() {
    const authUser = useSelector((s: RootState) => s.auth.user);
    const accessToken = useSelector((s: RootState) => s.auth.accessToken);

    const [user, setUser] = useState<TutorUser | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentMode, setCurrentMode] = useState<string>("listening");
    const [unitTitle, setUnitTitle] = useState("");
    const [currentTargetText, setCurrentTargetText] = useState<string>("");
    const [practice, setPractice] = useState<TutorPractice>({});
    const [availableActions, setAvailableActions] = useState<TutorAction[]>(["hint", "repeat", "review", "restart", "continue"]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Initialize session on mount
    useEffect(() => {
        if (!accessToken) return;
        const lineUserId = (authUser as any)?.lineUserId || (authUser as any)?.id || "";
        const displayName = (authUser as any)?.displayName || "";
        if (!lineUserId) return;
        setUser({ id: lineUserId, lineUserId, displayName, pictureUrl: (authUser as any)?.pictureUrl });
        initSession(lineUserId, displayName);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken]);

    const initSession = async (userId: string, displayName: string) => {
        try {
            setIsLoading(true);
            const result = await startSession(userId, "mixed", displayName);
            setSessionId(result.sessionId);
            if (result.unit?.title) setUnitTitle(`Unit ${result.unit.unitNo}: ${result.unit.title}`);
            if (result.nextAction) setCurrentMode(parseMode(result.nextAction));
            if (result.availableActions) setAvailableActions(result.availableActions);

            if (result.messages && Array.isArray(result.messages)) {
                const initialMsgs: ChatMessage[] = result.messages.map((m: any) => ({
                    id: genId(),
                    role: (m.role || "assistant") as ChatMessage["role"],
                    content: m.content,
                    contentTh: m.contentTh,
                    type: (m.type || "text") as ChatMessage["type"],
                    timestamp: Date.now(),
                }));
                setMessages(initialMsgs);
            } else if (result.message) {
                // Fallback for old structure
                setMessages([{
                    id: genId(),
                    role: "assistant",
                    content: result.message.content || "สวัสดีครับ! ผมพร้อมสอนภาษาอังกฤษแล้ว 🎉",
                    contentTh: result.message.contentTh,
                    type: "text",
                    timestamp: Date.now(),
                }]);
            }

            // If new session (or if needed), fetch first step. 
            // We check if we only have 1 message (the intro message) to auto-fetch next step.
            if (result.sessionId && (!result.messages || result.messages.length <= 1)) {
                fetchNextStep(result.sessionId, userId);
            }
        } catch (err: any) {
            addAssistantMsg("เกิดข้อผิดพลาดในการเริ่มเซสชัน กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchNextStep = async (sid: string, userId: string) => {
        try {
            setIsLoading(true);
            addLoadingBubble();
            const step = await getNextStep(sid, userId);
            removeLoadingBubble();

            if (step.mode) setCurrentMode(parseMode(step.mode || step.nextAction));

            applyPractice({
                lessonItemId: step.lessonItemId,
                targetText: step.targetText,
                passage: step.passage,
                pattern: step.pattern,
                ttsAvailable: step.ttsAvailable,
            });

            // Build AI tutor message from step
            let content = step.instruction || "";
            let contentTh = "";
            if (step.explanation) {
                const explanation = step.explanation as any;
                content = [explanation.message, explanation.pattern ? `Pattern: ${explanation.pattern}` : ""].filter(Boolean).join("\n\n");
                contentTh = explanation.messageTh || "";
                if (Array.isArray(explanation.examples) && explanation.examples.length > 0) {
                    content += `\n\nExamples:\n${explanation.examples.slice(0, 3).map((ex: any) => `- ${ex.en}${ex.th ? ` (${ex.th})` : ""}`).join("\n")}`;
                }
            }
            if (step.passage) content += `\n\n"${step.passage}"`;
            if (step.pattern && !content.includes(step.pattern)) content += `\n\nPattern: ${step.pattern}`;
            if (content) {
                addAssistantMsg(content, contentTh);
                // Auto-play TTS for listening mode
                if (step.ttsAvailable && step.targetText) {
                    playTTS(step.targetText);
                }
            }
        } catch {
            removeLoadingBubble();
        } finally {
            setIsLoading(false);
        }
    };

    // Play TTS (for listening practice and regeneration)
    const playTTS = useCallback(async (text: string) => {
        try {
            const audioUrl = await synthesizeTTS(text);
            const audio = new Audio(audioUrl);
            audio.play();
        } catch {
            console.warn("TTS failed");
        }
    }, []);

    const applyPractice = useCallback((next?: TutorPractice) => {
        if (!next) return;
        setPractice((prev) => ({ ...prev, ...next }));
        if (next.targetText) setCurrentTargetText(next.targetText);
    }, []);

    const shouldAutoContinue = (nextAction?: string) => {
        if (!nextAction) return false;
        return !["wait_for_answer", "retry", "retry_listening", "retry_speaking", "retry_reading", "show_hint", "repeat_current", "answer_question", "review_unit"].includes(nextAction);
    };

    const applyTurnResponse = useCallback((turn: TutorTurnResponse) => {
        if (turn.unit?.title) setUnitTitle(`Unit ${turn.unit.unitNo}: ${turn.unit.title}`);
        if (turn.mode || turn.nextAction) setCurrentMode(parseMode(turn.mode || turn.nextAction));
        if (turn.practice) applyPractice(turn.practice);
        if (turn.availableActions) setAvailableActions(turn.availableActions);

        const assistantMessages = (turn.messages || []).filter((m) => m.role !== "user");
        if (assistantMessages.length > 0) {
            setMessages((prev) => [
                ...prev,
                ...assistantMessages.map((m) => ({
                    id: genId(),
                    role: m.role,
                    content: m.content,
                    contentTh: m.contentTh,
                    type: (m.type || (turn.result ? "result" : "text")) as ChatMessage["type"],
                    result: turn.result as any,
                    timestamp: Date.now(),
                })),
            ]);
        } else if (turn.result) {
            const result = turn.result as any;
            let msgContent = result.isCorrect !== undefined
                ? (result.isCorrect ? "Correct" : "Not quite right")
                : "Feedback";
            if (result.correction) msgContent += `\n\nCorrection: ${result.correction}`;
            if (result.nativeSuggestion) msgContent += `\n\nNatural: ${result.nativeSuggestion}`;
            if (result.hint) msgContent += `\n\nHint: ${result.hint}`;
            addResultMsg(msgContent, result.feedbackTh, result);
        }

        if (turn.practice?.ttsAvailable && turn.practice.targetText && (turn.nextAction === "repeat_current" || turn.nextAction === "start_listening")) {
            void playTTS(turn.practice.targetText);
        }

        if (shouldAutoContinue(turn.nextAction) && sessionId && user) {
            setTimeout(() => fetchNextStep(sessionId, user.lineUserId), 900);
        }
    }, [applyPractice, playTTS, sessionId, user]);

    // Handle text answer
    const handleSendText = useCallback(async (text: string) => {
        if (!sessionId || !user) return;
        addUserMsg(text);
        setIsLoading(true);
        addLoadingBubble();

        try {
            const turn = await submitTutorTurn(sessionId, user.lineUserId, text, "text", "answer");
            removeLoadingBubble();
            applyTurnResponse(turn);
        } catch (err: any) {
            removeLoadingBubble();
            addAssistantMsg("เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, user, applyTurnResponse]);

    // Handle audio recording (speaking mode)
    const handleSendAudio = useCallback(async (blob: Blob) => {
        if (!sessionId || !user) return;
        addUserMsg("🎤 Voice message sent", "audio");
        setIsLoading(true);
        addLoadingBubble();

        try {
            const response: any = await submitSpeakingAudio(sessionId, user.lineUserId, blob);
            removeLoadingBubble();

            if (response?.messages || response?.practice || response?.intent) {
                applyTurnResponse(response as TutorTurnResponse);
                return;
            }

            const result = response;
            let content = result.transcript
                ? `I heard: "${result.transcript}"`
                : "Processing your speech...";
            if (result.correction) content += `\n\n✏️ Correction: ${result.correction}`;

            addResultMsg(content, result.feedbackTh, result);

            if (result.nextAction) {
                setCurrentMode(parseMode(result.nextAction));
                if (result.nextAction !== "wait_for_answer" && result.nextAction !== "retry_speaking" && result.nextAction !== "retry") {
                    setTimeout(() => fetchNextStep(sessionId, user.lineUserId), 1500);
                }
            }
        } catch {
            removeLoadingBubble();
            addAssistantMsg("ไม่สามารถประมวลผลเสียงได้ กรุณาลองอีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, user, applyTurnResponse]);

    // TTS playback for chat bubbles
    const handlePlayAudio = useCallback(async (text: string) => {
        await playTTS(text);
    }, [playTTS]);

    // Regenerate TTS for listening
    const handleRegenerateTTS = useCallback(async () => {
        if (currentTargetText) {
            await playTTS(currentTargetText);
        }
    }, [currentTargetText, playTTS]);

    const actionLabel: Record<TutorAction, string> = {
        answer: "ตอบ",
        hint: "ขอใบ้",
        repeat: currentMode === "listening" ? "ฟังอีกครั้ง" : "อีกรอบ",
        review: "ขอทวน",
        restart: "เริ่มใหม่",
        continue: "เรียนต่อ",
    };

    const handleAction = useCallback(async (action: TutorAction) => {
        if (!sessionId || !user || isLoading) return;
        if (action === "repeat" && currentMode === "listening" && currentTargetText) {
            await playTTS(currentTargetText);
        }
        addUserMsg(actionLabel[action] || action);
        setIsLoading(true);
        addLoadingBubble();
        try {
            const turn = await submitTutorTurn(sessionId, user.lineUserId, actionLabel[action] || action, "text", action);
            removeLoadingBubble();
            applyTurnResponse(turn);
        } catch {
            removeLoadingBubble();
            addAssistantMsg("ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, user, isLoading, currentMode, currentTargetText, playTTS, applyTurnResponse, actionLabel]);

    // --- Message helpers ---
    const addAssistantMsg = (content: string, contentTh?: string) => {
        setMessages((prev) => [...prev, {
            id: genId(), role: "assistant", content, contentTh, type: "text", timestamp: Date.now(),
        }]);
    };
    const addUserMsg = (content: string, type: "text" | "audio" = "text") => {
        setMessages((prev) => [...prev, {
            id: genId(), role: "user", content, type, timestamp: Date.now(),
        }]);
    };
    const addResultMsg = (content: string, contentTh?: string, result?: any) => {
        setMessages((prev) => [...prev, {
            id: genId(), role: "assistant", content, contentTh, type: "result", result, timestamp: Date.now(),
        }]);
    };
    const addLoadingBubble = () => {
        setMessages((prev) => [...prev, {
            id: "loading", role: "assistant", content: "", type: "loading", timestamp: Date.now(),
        }]);
    };
    const removeLoadingBubble = () => {
        setMessages((prev) => prev.filter((m) => m.id !== "loading"));
    };

    const parseMode = (action: string): string => {
        if (action.includes("listening")) return "listening";
        if (action.includes("speaking")) return "speaking";
        if (action.includes("reading")) return "reading";
        if (action.includes("review") || action.includes("vocabulary")) return "review";
        if (action.includes("grammar")) return "listening";
        return currentMode;
    };

    return (
        <div className="flex flex-col h-[100dvh] gradient-bg">
            <TutorHeader
                user={user}
                unitTitle={unitTitle}
                currentMode={currentMode}
            />

            {/* Chat area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-4 py-4 pb-40"
            >
                {/* Welcome card (if no messages) */}
                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
                        <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mb-6 animate-float">
                            <span className="text-3xl">📚</span>
                        </div>
                        <h2 className="text-xl font-bold mb-2">AI English Tutor</h2>
                        <p className="text-slate-400 text-sm max-w-xs">
                            ระบบกำลังเตรียมบทเรียนให้คุณ<br />
                            AI จะตัดสินใจว่าควรสอนอะไรตามความก้าวหน้าของคุณ
                        </p>
                    </div>
                )}

                {messages.map((msg) => (
                    <ChatBubble
                        key={msg.id}
                        message={msg}
                        onPlayAudio={msg.role === "assistant" ? handlePlayAudio : undefined}
                    />
                ))}

                {/* Regenerate TTS button for listening mode */}
                {currentMode === "listening" && currentTargetText && !isLoading && (
                    <div className="flex justify-center my-3">
                        <button
                            onClick={handleRegenerateTTS}
                            className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-slate-300 hover:text-white transition-colors active:scale-95"
                            id="btn-regenerate-tts"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                            </svg>
                            🔄 ฟังอีกครั้ง
                        </button>
                    </div>
                )}
                {availableActions.length > 0 && !isLoading && (
                    <div className="flex flex-wrap justify-center gap-2 my-3">
                        {availableActions.filter((a) => a !== "answer").map((action) => (
                            <button
                                key={action}
                                onClick={() => handleAction(action)}
                                className="px-3 py-2 rounded-full glass text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-colors active:scale-95"
                            >
                                {actionLabel[action]}
                            </button>
                        ))}
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input bar */}
            <div className="mb-14">
                <InputBar
                    mode={isLoading ? "disabled" : "text"}
                    currentPracticeMode={currentMode}
                    onSendText={handleSendText}
                    onSendAudio={handleSendAudio}
                    isLoading={isLoading}
                    placeholder={
                        currentMode === "listening" ? "Type what you heard... (หรือพิมพ์ hint เพื่อขอคำใบ้)" :
                        currentMode === "speaking" ? "พูดหรือพิมพ์ประโยคภาษาอังกฤษ..." :
                        currentMode === "reading" ? "แปลเป็นภาษาไทย..." :
                        "Type your answer..."
                    }
                />
            </div>

            <BottomNav />
        </div>
    );
}
