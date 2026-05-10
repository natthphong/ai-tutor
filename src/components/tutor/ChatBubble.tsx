// src/components/tutor/ChatBubble.tsx
import { useState, useRef, useCallback, type FC } from "react";
import type { ChatMessage } from "@/types/tutor";

type Props = { message: ChatMessage; onPlayAudio?: (text: string) => void };

const ChatBubble: FC<Props> = ({ message, onPlayAudio }) => {
    const [showTh, setShowTh] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const handlePlay = useCallback(() => {
        if (message.audioUrl) {
            if (audioRef.current) {
                audioRef.current.src = message.audioUrl;
                audioRef.current.play();
                setIsPlaying(true);
                audioRef.current.onended = () => setIsPlaying(false);
            }
        } else if (onPlayAudio) {
            onPlayAudio(message.content);
        }
    }, [message, onPlayAudio]);

    if (message.type === "loading") {
        return (
            <div className="flex items-start gap-3 mb-4 animate-fade-in">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">🤖</span>
                </div>
                <div className="bubble-assistant px-4 py-3">
                    <div className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                </div>
            </div>
        );
    }

    // Assistant message
    if (message.role === "assistant") {
        return (
            <div className="flex items-start gap-3 mb-4 animate-slide-up">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs">🤖</span>
                </div>
                <div className="flex-1 max-w-[85%]">
                    <div className="bubble-assistant px-4 py-3">
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                            {showTh && message.contentTh ? message.contentTh : message.content}
                        </p>

                        {/* Result display */}
                        {message.type === "result" && message.result && (
                            <ResultDisplay result={message.result} />
                        )}

                        {/* Correction */}
                        {message.type === "correction" && (
                            <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                <p className="text-red-400 text-sm">{message.content}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-1.5 ml-1">
                        {onPlayAudio && (
                            <button
                                onClick={handlePlay}
                                className="p-1.5 rounded-full hover:bg-white/5 transition-colors"
                                title="Listen"
                            >
                                {isPlaying ? (
                                    <AudioWaveIcon />
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                                    </svg>
                                )}
                            </button>
                        )}
                        {message.contentTh && (
                            <button
                                onClick={() => setShowTh(!showTh)}
                                className="p-1.5 rounded-full hover:bg-white/5 transition-colors text-xs text-slate-500"
                                title="แปลไทย"
                            >
                                🇹🇭
                            </button>
                        )}
                    </div>
                </div>
                <audio ref={audioRef} className="hidden" />
            </div>
        );
    }

    // User message
    return (
        <div className="flex justify-end mb-4 animate-slide-up">
            <div className="max-w-[80%]">
                <div className="bubble-user px-4 py-3">
                    <p className="text-[15px] leading-relaxed">{message.content}</p>
                </div>
                {message.audioUrl && (
                    <div className="flex justify-end mt-1">
                        <span className="text-xs text-slate-500">🎤 Voice</span>
                    </div>
                )}
            </div>
        </div>
    );
};

function AudioWaveIcon() {
    return (
        <div className="flex items-center gap-0.5 h-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="audio-bar" />
            ))}
        </div>
    );
}

function ResultDisplay({ result }: { result: any }) {
    const score = result.score ?? 0;
    const scoreClass = score >= 0.8 ? "score-pass" : score >= 0.5 ? "score-mid" : "score-fail";

    return (
        <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-3 mb-2">
                <div className={`score-circle text-sm ${scoreClass}`}>
                    {Math.round(score * 100)}%
                </div>
                <div>
                    <p className="font-medium text-sm">
                        {score >= 0.8 ? "🎉 Excellent!" : score >= 0.5 ? "👍 Good try" : "💪 Keep practicing"}
                    </p>
                    {result.feedbackTh && (
                        <p className="text-xs text-slate-400 mt-0.5">{result.feedbackTh}</p>
                    )}
                </div>
            </div>
            {result.correction && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-400 font-medium mb-1">✏️ Correction</p>
                    <p className="text-sm text-slate-300">{result.correction}</p>
                </div>
            )}
            {result.vocabulary && result.vocabulary.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.vocabulary.slice(0, 5).map((v: any, i: number) => (
                        <span key={i} className="px-2 py-1 rounded-full text-xs glass text-slate-300">
                            {v.word} · {v.meaningTh}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ChatBubble;
