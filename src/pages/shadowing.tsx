// src/pages/shadowing.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/tutor/BottomNav";
import {
    createShadowingClip,
    createShadowingFolder,
    deleteShadowingFolder,
    listShadowingClips,
    listShadowingFolders,
    markShadowingWatched,
    moveShadowingClipToFolder,
    type ShadowingClip,
    type ShadowingFolder,
} from "@/services/shadowingApi";

export default function ShadowingListPage() {
    const [recent, setRecent] = useState<ShadowingClip[]>([]);
    const [resume, setResume] = useState<ShadowingClip[]>([]);
    const [folders, setFolders] = useState<ShadowingFolder[]>([]);
    const [folderFilter, setFolderFilter] = useState<string>("");
    const [unwatched, setUnwatched] = useState(false);
    const [url, setUrl] = useState("");
    const [newFolderName, setNewFolderName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const refresh = async () => {
        try {
            const [r, w, fs] = await Promise.all([
                listShadowingClips({ sort: "recent", folderId: folderFilter || undefined, unwatched }),
                listShadowingClips({ sort: "watched", limit: 6 }),
                listShadowingFolders(),
            ]);
            setRecent(r);
            setResume(
                w.filter((c) => (c.lastSegmentIndex ?? 0) > 0 && !c.isCompleted),
            );
            setFolders(fs);
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || "load failed");
        }
    };

    useEffect(() => {
        void refresh();
        const t = setInterval(refresh, 6000);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [folderFilter, unwatched]);

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

    const onAddFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            await createShadowingFolder(newFolderName.trim());
            setNewFolderName("");
            await refresh();
        } catch {
            /* ignore */
        }
    };

    const onToggleWatched = async (clip: ShadowingClip) => {
        try {
            await markShadowingWatched(clip.id, !clip.isCompleted);
            await refresh();
        } catch {
            /* ignore */
        }
    };

    const onMove = async (clipId: string, folderId: string) => {
        try {
            await moveShadowingClipToFolder(clipId, folderId || null);
            await refresh();
        } catch {
            /* ignore */
        }
    };

    const onDeleteFolder = async (id: string) => {
        if (!confirm("ลบ folder นี้?")) return;
        try {
            await deleteShadowingFolder(id);
            if (folderFilter === id) setFolderFilter("");
            await refresh();
        } catch {
            /* ignore */
        }
    };

    const folderById = useMemo(() => {
        const m = new Map<string, ShadowingFolder>();
        folders.forEach((f) => m.set(f.id, f));
        return m;
    }, [folders]);

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-28">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                <h1 className="text-2xl font-bold mb-2">Shadowing 🗣️</h1>
                <p className="text-slate-400 text-sm mb-6">
                    วาง YouTube link เพื่อให้ AI ตัด transcript เป็นช่วงแล้วฝึกพูดตามแบบ parroto.app
                </p>

                {/* Create */}
                <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 mb-6">
                    <input
                        type="text"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700 text-sm outline-none focus:border-indigo-400"
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

                {/* Continue watching */}
                {resume.length > 0 && (
                    <section className="mb-6">
                        <h2 className="text-sm font-semibold mb-2 uppercase tracking-wider text-slate-400">
                            ดูต่อ ({resume.length})
                        </h2>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {resume.map((c) => (
                                <Link
                                    key={c.id}
                                    href={`/shadowing/${c.id}`}
                                    className="block rounded-xl bg-slate-900/70 border border-slate-800 p-3 hover:border-indigo-400 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        {c.thumbnailUrl && (
                                            <img
                                                src={c.thumbnailUrl}
                                                alt=""
                                                className="w-20 h-14 object-cover rounded"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">
                                                {c.title || `YouTube ${c.youtubeId}`}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                ดูถึงประโยค #{(c.lastSegmentIndex || 0) + 1} ·{" "}
                                                {Math.round(c.lastWatchedTime || 0)}s
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Folders */}
                <section className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                            Folders
                        </h2>
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="New folder"
                                className="px-2 py-1 rounded bg-slate-800/60 border border-slate-700 text-xs"
                            />
                            <button
                                onClick={onAddFolder}
                                className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs"
                            >
                                +
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFolderFilter("")}
                            className={`px-3 py-1.5 rounded-full text-xs ${
                                folderFilter === ""
                                    ? "bg-indigo-500 text-white"
                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            }`}
                        >
                            All ({recent.length})
                        </button>
                        {folders.map((f) => (
                            <div key={f.id} className="flex items-center gap-1">
                                <button
                                    onClick={() => setFolderFilter(f.id)}
                                    className={`px-3 py-1.5 rounded-l-full text-xs ${
                                        folderFilter === f.id
                                            ? "bg-indigo-500 text-white"
                                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                    }`}
                                >
                                    {f.name} ({f.clipCount})
                                </button>
                                <button
                                    onClick={() => onDeleteFolder(f.id)}
                                    className="px-2 py-1.5 rounded-r-full text-xs bg-slate-800 text-slate-500 hover:text-red-300"
                                    title="Delete folder"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        <label className="inline-flex items-center gap-1 ml-auto text-xs text-slate-400">
                            <input
                                type="checkbox"
                                checked={unwatched}
                                onChange={(e) => setUnwatched(e.target.checked)}
                            />
                            ยังไม่ได้ดู
                        </label>
                    </div>
                </section>

                {/* Clip list */}
                <section>
                    <h2 className="text-sm font-semibold mb-2 uppercase tracking-wider text-slate-400">
                        ประวัติคลิป
                    </h2>
                    <div className="space-y-3">
                        {recent.length === 0 && (
                            <p className="text-slate-500 text-sm">
                                ยังไม่มีคลิป — วาง YouTube link ด้านบนเพื่อเริ่ม
                            </p>
                        )}
                        {recent.map((c) => (
                            <div
                                key={c.id}
                                className="rounded-xl bg-slate-900/60 border border-slate-800 p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <Link href={`/shadowing/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                                        {c.thumbnailUrl && (
                                            <img
                                                src={c.thumbnailUrl}
                                                alt=""
                                                className="w-24 h-16 object-cover rounded-md"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">
                                                {c.title || `YouTube ${c.youtubeId}`}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                สถานะ: <span className={statusColor(c.status)}>{c.status}</span>
                                                {c.transcriptStatus && c.transcriptStatus !== "ready" && (
                                                    <>
                                                        {" · transcript: "}
                                                        <span className={statusColor(c.transcriptStatus)}>
                                                            {c.transcriptStatus}
                                                        </span>
                                                    </>
                                                )}
                                                {c.durationSeconds > 0 && ` · ${Math.round(c.durationSeconds)}s`}
                                                {c.folderId && folderById.get(c.folderId) && (
                                                    <> · 📁 {folderById.get(c.folderId)?.name}</>
                                                )}
                                            </div>
                                            {c.errorMessage && c.status === "failed" && (
                                                <div className="text-xs text-red-400 mt-1">{c.errorMessage}</div>
                                            )}
                                        </div>
                                    </Link>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => onToggleWatched(c)}
                                            className={`px-2 py-1 rounded text-xs ${
                                                c.isCompleted
                                                    ? "bg-emerald-500/20 text-emerald-300"
                                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                            }`}
                                            title={c.isCompleted ? "Mark as not watched" : "Mark as watched"}
                                        >
                                            {c.isCompleted ? "✓ watched" : "mark"}
                                        </button>
                                        <select
                                            value={c.folderId || ""}
                                            onChange={(e) => onMove(c.id, e.target.value)}
                                            className="text-xs bg-slate-800 border border-slate-700 rounded px-1 py-1"
                                            title="Move to folder"
                                        >
                                            <option value="">No folder</option>
                                            {folders.map((f) => (
                                                <option key={f.id} value={f.id}>
                                                    {f.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
            <BottomNav />
        </div>
    );
}

function statusColor(s: string) {
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
