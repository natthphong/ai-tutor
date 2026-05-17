// src/pages/shadowing.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/tutor/BottomNav";
import {
    createShadowingClip,
    listShadowingClips,
    type ShadowingClip,
} from "@/services/shadowingApi";

export default function ShadowingListPage() {
    const [clips, setClips] = useState<ShadowingClip[]>([]);
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const refresh = async () => {
        try {
            const items = await listShadowingClips(30);
            setClips(items);
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || "load failed");
        }
    };

    useEffect(() => {
        void refresh();
        const t = setInterval(refresh, 6000); // light polling for processing → ready
        return () => clearInterval(t);
    }, []);

    const onCreate = async () => {
        if (!url) return;
        setLoading(true);
        setError("");
        try {
            await createShadowingClip(url);
            setUrl("");
            await refresh();
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || "create failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 pb-28 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Shadowing 🗣️</h1>
            <p className="text-slate-400 text-sm mb-6">
                วาง YouTube link เพื่อให้ AI ตัด transcript เป็นช่วงแล้วฝึกพูดตามแบบ parroto.app
            </p>

            <div className="glass rounded-2xl p-4 mb-6">
                <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700 text-sm text-white outline-none focus:border-indigo-400"
                />
                <button
                    disabled={loading}
                    onClick={onCreate}
                    className="mt-3 w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50"
                >
                    {loading ? "กำลังสร้าง..." : "สร้าง Shadowing Clip"}
                </button>
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <h2 className="text-lg font-semibold mb-3">ประวัติคลิป</h2>
            <div className="space-y-3">
                {clips.length === 0 && (
                    <p className="text-slate-500 text-sm">ยังไม่มีคลิป — วาง YouTube link ด้านบนเพื่อเริ่ม</p>
                )}
                {clips.map((c) => (
                    <Link
                        key={c.id}
                        href={`/shadowing/${c.id}`}
                        className="block glass rounded-xl p-3 hover:bg-white/5 transition"
                    >
                        <div className="flex items-center gap-3">
                            {c.thumbnailUrl && (
                                <img src={c.thumbnailUrl} alt="" className="w-24 h-16 object-cover rounded-md" />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{c.title || c.youtubeUrl}</div>
                                <div className="text-xs text-slate-400">
                                    สถานะ: <span className={statusColor(c.status)}>{c.status}</span>
                                    {c.durationSeconds > 0 && ` · ${Math.round(c.durationSeconds)}s`}
                                </div>
                                {c.errorMessage && c.status === "failed" && (
                                    <div className="text-xs text-red-400 mt-1">{c.errorMessage}</div>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
            <BottomNav />
        </div>
    );
}

function statusColor(s: ShadowingClip["status"]) {
    switch (s) {
        case "ready":
            return "text-emerald-400";
        case "failed":
            return "text-red-400";
        case "processing":
            return "text-amber-400";
        default:
            return "text-slate-300";
    }
}
