// src/pages/index.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import type { ChatMessage, TutorUser } from "@/types/tutor";
import TutorHeader from "@/components/tutor/TutorHeader";
import ChatBubble from "@/components/tutor/ChatBubble";
import InputBar from "@/components/tutor/InputBar";
import BottomNav from "@/components/tutor/BottomNav";
import {
    startSession,
    getNextStep,
    submitListeningAnswer,
    submitSpeakingAudio,
    submitReadingAnswer,
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
            addLoadingBubble();
            const result = await startSession(userId, "mixed", displayName);
            setSessionId(result.sessionId);
            if (result.unit?.title) setUnitTitle(`Unit ${result.unit.unitNo}: ${result.unit.title}`);
            if (result.nextAction) setCurrentMode(parseMode(result.nextAction));

            removeLoadingBubble();
            addAssistantMsg(
                result.message?.content || "สวัสดีครับ! ผมพร้อมสอนภาษาอังกฤษแล้ว 🎉",
                result.message?.contentTh
            );

            // Auto fetch first step
            if (result.sessionId) {
                fetchNextStep(result.sessionId, userId);
            }
        } catch (err: any) {
            removeLoadingBubble();
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

            // Build AI tutor message from step
            let content = step.instruction || "";
            if (step.passage) content += `\n\n"${step.passage}"`;
            if (step.pattern) content += `\n\n📝 Pattern: ${step.pattern}`;
            if (content) addAssistantMsg(content);
        } catch {
            removeLoadingBubble();
        } finally {
            setIsLoading(false);
        }
    };

    // Handle text answer
    const handleSendText = useCallback(async (text: string) => {
        if (!sessionId || !user) return;
        addUserMsg(text);
        setIsLoading(true);
        addLoadingBubble();

        try {
            let result: any;
            if (currentMode === "listening") {
                result = await submitListeningAnswer(sessionId, user.lineUserId, text);
            } else if (currentMode === "reading") {
                result = await submitReadingAnswer(sessionId, user.lineUserId, text);
            } else {
                // Fallback: treat as listening
                result = await submitListeningAnswer(sessionId, user.lineUserId, text);
            }

            removeLoadingBubble();

            // Show result
            const feedback = result.isCorrect !== undefined
                ? (result.isCorrect ? "✅ Correct!" : "❌ Not quite right")
                : "";
            addResultMsg(
                feedback + (result.correction ? `\n\nCorrection: ${result.correction}` : ""),
                result.feedbackTh,
                result
            );

            // Handle next action
            if (result.nextAction) {
                setCurrentMode(parseMode(result.nextAction));
                if (result.nextAction !== "wait_for_answer") {
                    setTimeout(() => fetchNextStep(sessionId, user.lineUserId), 1500);
                }
            }
        } catch (err: any) {
            removeLoadingBubble();
            addAssistantMsg("เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, user, currentMode]);

    // Handle audio recording (speaking mode)
    const handleSendAudio = useCallback(async (blob: Blob) => {
        if (!sessionId || !user) return;
        addUserMsg("🎤 Voice message sent", "audio");
        setIsLoading(true);
        addLoadingBubble();

        try {
            const result = await submitSpeakingAudio(sessionId, user.lineUserId, blob);
            removeLoadingBubble();

            let content = result.transcript
                ? `I heard: "${result.transcript}"`
                : "Processing your speech...";
            if (result.correction) content += `\n\n✏️ Correction: ${result.correction}`;

            addResultMsg(content, result.feedbackTh, result);

            if (result.nextAction) {
                setCurrentMode(parseMode(result.nextAction));
                if (result.nextAction !== "wait_for_answer") {
                    setTimeout(() => fetchNextStep(sessionId, user.lineUserId), 1500);
                }
            }
        } catch {
            removeLoadingBubble();
            addAssistantMsg("ไม่สามารถประมวลผลเสียงได้ กรุณาลองอีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, user]);

    // TTS playback
    const handlePlayAudio = useCallback(async (text: string) => {
        try {
            const audioUrl = await synthesizeTTS(text);
            const audio = new Audio(audioUrl);
            audio.play();
        } catch {
            console.warn("TTS failed");
        }
    }, []);

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

    const inputMode = currentMode === "speaking" ? "audio" as const : "text" as const;

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
                <div ref={chatEndRef} />
            </div>

            {/* Input bar */}
            <div className="mb-14">
                <InputBar
                    mode={isLoading ? "disabled" : inputMode}
                    currentPracticeMode={currentMode}
                    onSendText={handleSendText}
                    onSendAudio={handleSendAudio}
                    isLoading={isLoading}
                    placeholder={
                        currentMode === "listening" ? "Type what you heard..." :
                        currentMode === "reading" ? "แปลเป็นภาษาไทย..." :
                        "Type your answer..."
                    }
                />
            </div>

            <BottomNav />
        </div>
    );
}