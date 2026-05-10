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

    // Determine what to show based on practice mode
    const showRecordButton = currentPracticeMode === "speaking" || mode === "audio";
    const showTextInput = currentPracticeMode !== "speaking" && mode !== "audio";

    if (mode === "disabled") {
        return (
            <div className="px-4 py-3 glass border-t border-white/5 safe-bottom">
                <div className="flex items-center justify-center py-2">
                    <p className="text-slate-500 text-sm">กำลังรอ AI Tutor...</p>
                </div>
            </div>
        );
    }

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
                </div>
            )}

            <div className="flex items-end gap-2">
                {/* Text input (for listening & reading) */}
                {showTextInput && !isRecording && (
                    <form onSubmit={handleSubmit} className="flex-1 flex items-end gap-2">
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={placeholder || "พิมพ์คำตอบ..."}
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 transition-colors"
                            disabled={isLoading}
                            id="chat-input"
                        />
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
                    </form>
                )}

                {/* Record button (for speaking) */}
                {showRecordButton && (
                    <div className="flex-1 flex justify-center">
                        <button
                            onClick={handleRecordToggle}
                            disabled={isLoading}
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                                isRecording
                                    ? "bg-red-500 shadow-lg shadow-red-500/30 recording-indicator"
                                    : "gradient-primary shadow-lg shadow-indigo-500/20 hover:shadow-xl"
                            }`}
                            id="btn-record"
                        >
                            {isRecording ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                    <rect x="6" y="6" width="12" height="12" rx="2" />
                                </svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                    <line x1="12" y1="19" x2="12" y2="23" />
                                    <line x1="8" y1="23" x2="16" y2="23" />
                                </svg>
                            )}
                        </button>
                    </div>
                )}

                {/* Keyboard toggle for speaking mode */}
                {showRecordButton && !isRecording && (
                    <button
                        onClick={() => {/* could toggle text mode */}}
                        className="p-3 rounded-xl glass text-slate-400 hover:text-white transition-colors"
                        title="Use keyboard"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default InputBar;
