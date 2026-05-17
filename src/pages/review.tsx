// src/pages/review.tsx
import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import BottomNav from "@/components/tutor/BottomNav";
import { getDueReviews, getReviewFlashcards, reviewFlashcard, synthesizeTTS } from "@/services/tutorApi";
import type { ReviewFlashcardItem } from "@/types/tutor";

export default function ReviewPage() {
    const user = useSelector((s: RootState) => s.auth.user) as any;
    const [cards, setCards] = useState<ReviewFlashcardItem[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [completed, setCompleted] = useState(false);
    const [dueCount, setDueCount] = useState(0);

    useEffect(() => {
        if (!user?.lineUserId && !user?.id) return;
        const userId = user.lineUserId || user.id;
        Promise.all([getDueReviews(userId), getReviewFlashcards(userId, 20)])
            .then(([dueData, cardsData]: any[]) => {
                const count = (dueData.vocabularyDueCount || 0) + (dueData.weaknessDueCount || 0) + (dueData.unitReviewDueCount || 0);
                setDueCount(count);
                setCards(cardsData.cards || []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [user]);

    const handleScore = useCallback(async (score: number) => {
        const card = cards[currentIdx];
        if (!card || !user) return;
        const userId = user.lineUserId || user.id;
        try {
            await reviewFlashcard(card.id, userId, score);
        } catch {}
        if (currentIdx < cards.length - 1) {
            setCurrentIdx((i) => i + 1);
            setFlipped(false);
        } else {
            setCompleted(true);
        }
    }, [cards, currentIdx, user]);

    const handlePlayWord = useCallback(async (text: string) => {
        try {
            const url = await synthesizeTTS(text);
            new Audio(url).play();
        } catch {}
    }, []);

    const card = cards[currentIdx];
    const progress = cards.length > 0 ? ((currentIdx + (completed ? 1 : 0)) / cards.length) * 100 : 0;

    return (
        <div className="min-h-screen gradient-bg safe-top pb-24">
            <header className="px-6 pt-6 pb-4">
                <h1 className="text-2xl font-bold">Review</h1>
                <p className="text-slate-400 text-sm mt-1">
                    {dueCount > 0 ? `${dueCount} cards due for review` : "All caught up! 🎉"}
                </p>
            </header>

            {loading ? (
                <div className="flex justify-center pt-20">
                    <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : completed ? (
                <div className="flex flex-col items-center justify-center px-6 pt-20 text-center animate-slide-up">
                    <div className="w-24 h-24 rounded-3xl bg-emerald-500/20 flex items-center justify-center mb-6">
                        <span className="text-5xl">🎉</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Review Complete!</h2>
                    <p className="text-slate-400">
                        ทบทวนเสร็จแล้ว {cards.length} cards<br />
                        เยี่ยมมาก! กลับมาทบทวนใหม่พรุ่งนี้นะ
                    </p>
                </div>
            ) : cards.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 pt-20 text-center animate-fade-in">
                    <div className="w-24 h-24 rounded-3xl bg-indigo-500/20 flex items-center justify-center mb-6">
                        <span className="text-5xl">✨</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2">No Reviews Due</h2>
                    <p className="text-slate-400 text-sm">
                        ยังไม่มีคำศัพท์ที่ต้องทบทวน<br />
                        ไปเรียนต่อเพื่อสร้าง flashcard ใหม่!
                    </p>
                </div>
            ) : (
                <div className="px-4 animate-slide-up">
                    {/* Progress bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                            <span>{currentIdx + 1} / {cards.length}</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Flashcard */}
                    <div
                        onClick={() => setFlipped(!flipped)}
                        className="glass rounded-3xl p-8 min-h-[280px] flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.98] mb-6"
                    >
                        {!flipped ? (
                            <div className="text-center">
                                <p className="text-2xl font-bold mb-4">{card?.front}</p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handlePlayWord(card?.front || ""); }}
                                    className="p-3 rounded-full glass hover:bg-white/10 transition-colors"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                                    </svg>
                                </button>
                                <p className="text-xs text-slate-500 mt-4">Tap to reveal answer</p>
                            </div>
                        ) : (
                            <div className="text-center animate-fade-in">
                                <p className="text-lg text-slate-400 mb-2">{card?.front}</p>
                                <p className="text-2xl font-bold text-gradient mb-3">{card?.back}</p>
                                {card?.example && (
                                    <p className="text-sm text-slate-400 italic">&ldquo;{card.example}&rdquo;</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Score buttons (only when flipped) */}
                    {flipped && (
                        <div className="grid grid-cols-3 gap-3 animate-slide-up">
                            <button
                                onClick={() => handleScore(0.4)}
                                className="py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-medium text-sm active:scale-95 transition-transform"
                            >
                                😵 Again
                            </button>
                            <button
                                onClick={() => handleScore(0.7)}
                                className="py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium text-sm active:scale-95 transition-transform"
                            >
                                🤔 Hard
                            </button>
                            <button
                                onClick={() => handleScore(1)}
                                className="py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-sm active:scale-95 transition-transform"
                            >
                                🎯 Easy
                            </button>
                        </div>
                    )}
                </div>
            )}

            <BottomNav />
        </div>
    );
}
