// src/components/tutor/InputBar.tsx
import { useState, type FC, type FormEvent } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

type Mode = "text" | "audio" | "disabled";

type Props = {
    mode: Mode;
    placeholder?: string;
    onSendText: (text: string) => void;
    onSendAudio: (blob: Blob) => void;
    isLoading?: boolean;
    currentPracticeMode?: string;
};

const InputBar: FC<Props> = ({ mode, placeholder, onSendText, onSendAudio, isLoading, currentPracticeMode }) => {
    const [text, setText] = useState("");
    const [showKeyboard, setShowKeyboard] = useState(false);
    const { isRecording, duration, start, stop } = useAudioRecorder();

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (text.trim() && !isLoading) {
            onSendText(text.trim());
            setText("");
        }
    };

    const handleRecordToggle = async () => {
        if (isRecording) {
            const blob = await stop();
            if (blob.size > 0) onSendAudio(blob);
        } else {
            try { await start(); } catch { alert("ไม่สามารถเข้าถึงไมโครโฟนได้"); }
        }
    };

    const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

    if (mode === "disabled") {
        return (
            <div className="px-4 py-3 glass border-t border-white/5 safe-bottom">
                <div className="flex items-center justify-center py-2">
                    <p className="text-slate-500 text-sm">กำลังรอ AI Tutor...</p>
                </div>
            </div>
        );
    }

    // Always show text input (user can always type)
    // Always show mic button (user can always speak)
    const isTextPrimary = currentPracticeMode !== "speaking" || showKeyboard;

    return (
        <div className="px-4 py-3 glass border-t border-white/5 safe-bottom">
            {/* Mode indicator */}
            <div className="flex items-center justify-center mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
                    currentPracticeMode === "listening" ? "mode-listening" :
                    currentPracticeMode === "speaking" ? "mode-speaking" :
                    currentPracticeMode === "reading" ? "mode-reading" :
                    "mode-review"
                }`}>
                    {currentPracticeMode === "listening" ? "🎧 Listening" :
                     currentPracticeMode === "speaking" ? "🎤 Speaking" :
                     currentPracticeMode === "reading" ? "📖 Reading" :
                     "💬 Chat"}
                </span>
            </div>

            {/* Recording UI */}
            {isRecording && (
                <div className="flex items-center gap-3 mb-3 animate-fade-in">
                    <div className="w-3 h-3 rounded-full bg-red-500 recording-indicator" />
                    <span className="text-red-400 text-sm font-mono">{formatDuration(duration)}</span>
                    <div className="flex-1 flex items-center justify-center gap-1">
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <div key={i} className="audio-bar" style={{ animationDelay: `${i * 0.05}s` }} />
                        ))}
                    </div>
                    <button
                        onClick={handleRecordToggle}
                        className="p-3 rounded-full bg-red-500 text-white active:scale-90 transition-all"
                        id="btn-stop-record"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Main input area - always shows text + mic */}
            {!isRecording && (
                <div className="flex items-end gap-2">
                    {/* Text input - always visible */}
                    <form onSubmit={handleSubmit} className="flex-1 flex items-end gap-2">
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={
                                currentPracticeMode === "speaking"
                                    ? (showKeyboard ? "พิมพ์ประโยคภาษาอังกฤษ..." : placeholder || "กดไมค์เพื่อพูด หรือพิมพ์ได้เลย")
                                    : placeholder || "พิมพ์คำตอบ..."
                            }
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 transition-colors"
                            disabled={isLoading}
                            id="chat-input"
                            onFocus={() => { if (currentPracticeMode === "speaking") setShowKeyboard(true); }}
                        />
                        {/* Send text button */}
                        {text.trim() && (
                            <button
                                type="submit"
                                disabled={!text.trim() || isLoading}
                                className="p-3 rounded-2xl gradient-primary text-white disabled:opacity-30 transition-opacity active:scale-95"
                                id="btn-send"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                </svg>
                            </button>
                        )}
                    </form>

                    {/* Mic button - always visible when not typing */}
                    {!text.trim() && (
                        <button
                            onClick={handleRecordToggle}
                            disabled={isLoading}
                            className={`p-3 rounded-2xl transition-all active:scale-90 ${
                                currentPracticeMode === "speaking"
                                    ? "gradient-primary shadow-lg shadow-indigo-500/20 text-white"
                                    : "glass text-slate-400 hover:text-white"
                            }`}
                            id="btn-record"
                            title="กดค้างเพื่อพูด"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default InputBar;
