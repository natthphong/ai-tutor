// src/pages/progress.tsx
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import type { ProgressData } from "@/types/tutor";
import BottomNav from "@/components/tutor/BottomNav";
import { getProgress } from "@/services/tutorApi";

export default function ProgressPage() {
    const user = useSelector((s: RootState) => s.auth.user) as any;
    const [data, setData] = useState<ProgressData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.lineUserId && !user?.id) return;
        const userId = user.lineUserId || user.id;
        getProgress(userId).then(setData).catch(() => {}).finally(() => setLoading(false));
    }, [user]);

    return (
        <div className="min-h-screen gradient-bg safe-top pb-24">
            {/* Header */}
            <header className="px-6 pt-6 pb-4">
                <h1 className="text-2xl font-bold">Progress</h1>
                <p className="text-slate-400 text-sm mt-1">ความก้าวหน้าของคุณ</p>
            </header>

            {loading ? (
                <div className="flex justify-center pt-20">
                    <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="px-4 space-y-4 animate-slide-up">
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            icon="📖"
                            label="Current Unit"
                            value={data?.currentUnit || 1}
                            gradient="from-indigo-600/20 to-indigo-800/10"
                        />
                        <StatCard
                            icon="✅"
                            label="Completed"
                            value={data?.completedUnits || 0}
                            gradient="from-emerald-600/20 to-emerald-800/10"
                        />
                        <StatCard
                            icon="🔥"
                            label="Streak"
                            value={`${data?.streak || 0} days`}
                            gradient="from-amber-600/20 to-amber-800/10"
                        />
                        <StatCard
                            icon="📝"
                            label="Due Today"
                            value={(data?.dueToday?.vocabulary || 0) + (data?.dueToday?.weakness || 0)}
                            gradient="from-purple-600/20 to-purple-800/10"
                        />
                    </div>

                    {/* Skill scores */}
                    <div className="glass rounded-2xl p-5">
                        <h3 className="font-semibold mb-4">Skill Scores</h3>
                        <div className="space-y-4">
                            <SkillBar
                                label="🎧 Listening"
                                score={data?.scores?.listening || 0}
                                color="bg-indigo-500"
                            />
                            <SkillBar
                                label="🎤 Speaking"
                                score={data?.scores?.speaking || 0}
                                color="bg-amber-500"
                            />
                            <SkillBar
                                label="📖 Reading"
                                score={data?.scores?.reading || 0}
                                color="bg-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Weaknesses */}
                    {data?.topWeaknesses && data.topWeaknesses.length > 0 && (
                        <div className="glass rounded-2xl p-5">
                            <h3 className="font-semibold mb-3">Areas to Improve</h3>
                            <div className="flex flex-wrap gap-2">
                                {data.topWeaknesses.map((w, i) => (
                                    <span key={i} className="px-3 py-1.5 rounded-full text-xs bg-red-500/10 border border-red-500/20 text-red-400">
                                        {w}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <BottomNav />
        </div>
    );
}

function StatCard({ icon, label, value, gradient }: { icon: string; label: string; value: string | number; gradient: string }) {
    return (
        <div className={`glass rounded-2xl p-4 bg-gradient-to-br ${gradient}`}>
            <span className="text-2xl">{icon}</span>
            <p className="text-xl font-bold mt-2">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
        </div>
    );
}

function SkillBar({ label, score, color }: { label: string; score: number; color: string }) {
    const pct = Math.round(score * 100);
    return (
        <div>
            <div className="flex justify-between mb-1.5">
                <span className="text-sm">{label}</span>
                <span className="text-sm font-semibold text-slate-300">{pct}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-1000`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}
