// src/pages/shadowing/[clipId].tsx
//
// Parroto.app-style shadowing studio:
//   ┌──────────────────────────────┬──────────────────────────┐
//   │  Video + Practice + Record   │  Transcript list (cards) │
//   └──────────────────────────────┴──────────────────────────┘
// Bottom nav remains visible (shared layout).

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import Link from "next/link";
import BottomNav from "@/components/tutor/BottomNav";
import type { RootState } from "@/store";
import {
    getShadowingClip,
    listShadowingNotes,
    listShadowingRecordings,
    saveShadowingProgress,
    scoreShadowingRecording,
    translateSegment,
    upsertShadowingNote,
    uploadShadowingRecording,
    type ShadowingDetail,
    type ShadowingSegment,
} from "@/services/shadowingApi";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function ShadowingDetailPage() {
    const router = useRouter();
    const clipId = (router.query.clipId as string) || "";
    const accessToken = useSelector((s: RootState) => s.auth.accessToken);

    const [detail, setDetail] = useState<ShadowingDetail | null>(null);
    const [loadError, setLoadError] = useState("");
    const [currentIdx, setCurrentIdx] = useState(0);
    const [translations, setTranslations] = useState<Record<string, string>>({});
    const [autoPause, setAutoPause] = useState(true);
    const [loop, setLoop] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [largeVideo, setLargeVideo] = useState(false);

    const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
    const [recordingUrl, setRecordingUrl] = useState<string>("");
    const [isRecording, setIsRecording] = useState(false);
    const [score, setScore] = useState<{ score: number; feedback: string } | null>(null);
    const [note, setNote] = useState("");
    const [notes, setNotes] = useState<any[]>([]);
    const [recordings, setRecordings] = useState<any[]>([]);
    const [videoSrcError, setVideoSrcError] = useState(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Initial load + poll while processing.
    useEffect(() => {
        if (!clipId) return;
        let timer: ReturnType<typeof setInterval> | null = null;
        let alive = true;
        const load = async () => {
            try {
                const d = await getShadowingClip(clipId);
                if (!alive) return;
                setDetail(d);
                setLoadError("");
                const segs = Array.isArray(d?.segments) ? d.segments : [];
                if (d.progress?.currentSegmentIndex && segs.length > 0) {
                    setCurrentIdx(Math.min(d.progress.currentSegmentIndex, segs.length - 1));
                }
                if (d.clip.status === "ready" && segs.length > 0 && timer) {
                    clearInterval(timer);
                    timer = null;
                }
            } catch (e: any) {
                if (!alive) return;
                setLoadError(e?.response?.data?.message || e?.message || "Could not load clip");
            }
        };
        void load();
        timer = setInterval(load, 5000);
        return () => {
            alive = false;
            if (timer) clearInterval(timer);
        };
    }, [clipId]);

    useEffect(() => {
        if (!clipId) return;
        void listShadowingNotes(clipId).then(setNotes).catch(() => {});
    }, [clipId]);

    const segments: ShadowingSegment[] = useMemo(() => {
        return Array.isArray(detail?.segments) ? (detail!.segments as ShadowingSegment[]) : [];
    }, [detail]);

    const currentSeg: ShadowingSegment | undefined = useMemo(() => {
        if (segments.length === 0) return undefined;
        return segments[Math.min(currentIdx, segments.length - 1)];
    }, [segments, currentIdx]);

    useEffect(() => {
        if (!clipId || !currentSeg) return;
        listShadowingRecordings(clipId, currentSeg.id).then(setRecordings).catch(() => {});
        setRecordingUrl("");
        setRecordingBlob(null);
        setScore(null);
    }, [clipId, currentSeg]);

    useEffect(() => {
        if (videoRef.current) videoRef.current.playbackRate = speed;
    }, [speed]);

    // ----- player helpers -----
    const seekAndPlay = (seg: ShadowingSegment) => {
        const v = videoRef.current;
        if (!v) return;
        v.currentTime = seg.startTime;
        v.playbackRate = speed;
        void v.play().catch(() => {});
        const onTick = () => {
            if (!v) return;
            if (v.currentTime >= seg.endTime) {
                if (loop) {
                    v.currentTime = seg.startTime;
                    void v.play().catch(() => {});
                    return;
                }
                if (autoPause) {
                    v.pause();
                    v.removeEventListener("timeupdate", onTick);
                }
            }
        };
        v.addEventListener("timeupdate", onTick);
    };

    const persistProgress = async (idx: number, time: number) => {
        try {
            await saveShadowingProgress(clipId, idx, time, []);
        } catch {
            /* fail silently - never block playback */
        }
    };

    const jumpTo = (idx: number) => {
        if (segments.length === 0) return;
        const next = Math.max(0, Math.min(segments.length - 1, idx));
        setCurrentIdx(next);
        const seg = segments[next];
        if (seg) seekAndPlay(seg);
        void persistProgress(next, seg?.startTime || 0);
    };

    const onPrev = () => jumpTo(currentIdx - 1);
    const onNext = () => jumpTo(currentIdx + 1);
    const onReplay = () => currentSeg && seekAndPlay(currentSeg);
    const onPlayPause = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) void v.play().catch(() => {});
        else v.pause();
    };

    // Keyboard shortcuts.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;
            if (e.key === "ArrowLeft") onPrev();
            else if (e.key === "ArrowRight") onNext();
            else if (e.key === "r" || e.key === "R") onReplay();
            else if (e.key === " ") {
                e.preventDefault();
                onPlayPause();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIdx, segments.length]);

    // Cached translation toggle.
    const fetchTranslation = async (seg: ShadowingSegment) => {
        if (translations[seg.id] !== undefined) {
            setTranslations((m) => {
                const copy = { ...m };
                delete copy[seg.id];
                return copy;
            });
            return;
        }
        if (seg.thaiTranslation) {
            setTranslations((m) => ({ ...m, [seg.id]: seg.thaiTranslation }));
            return;
        }
        try {
            const r = await translateSegment(clipId, seg.id);
            setTranslations((m) => ({ ...m, [seg.id]: r.thaiTranslation || "(ยังไม่มีคำแปล)" }));
        } catch {
            setTranslations((m) => ({ ...m, [seg.id]: "(แปลไม่ได้)" }));
        }
    };

    // Recording.
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
            chunksRef.current = [];
            rec.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            rec.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                setRecordingBlob(blob);
                setRecordingUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach((t) => t.stop());
            };
            rec.start();
            mediaRecorderRef.current = rec;
            setIsRecording(true);
        } catch {
            /* ignore */
        }
    };
    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };
    const uploadAndScore = async () => {
        if (!recordingBlob || !currentSeg) return;
        try {
            const r = await uploadShadowingRecording(clipId, currentSeg.id, recordingBlob, 0);
            const list = await listShadowingRecordings(clipId, currentSeg.id);
            setRecordings(list);
            try {
                const grade = await scoreShadowingRecording(clipId, r.id);
                setScore(grade);
            } catch {
                /* AI scoring failed silently */
            }
        } catch {
            /* upload failed silently */
        }
    };

    const saveNote = async () => {
        if (!note.trim()) return;
        try {
            await upsertShadowingNote(clipId, currentSeg?.id || null, note.trim());
            setNote("");
            const list = await listShadowingNotes(clipId);
            setNotes(list);
        } catch {
            /* ignore */
        }
    };

    // ---- Resolve video source ----
    //
    // Order of preference:
    //   1. clip.streamUrl  → server returns a presigned MinIO URL.
    //   2. proxy stream via backend (works whenever MinIO is reachable to the
    //      backend, regardless of CORS or network visibility to the browser).
    //   3. youtube.com/embed (no shadow-able timing but at least playable).
    const clip = detail?.clip;
    const usingEmbed = !clip?.minioObjectKey;
    const proxySrc = useMemo(() => {
        if (!clip?.proxyStreamUrl) return "";
        const base = API_BASE_URL.replace(/\/$/, "");
        const path = clip.proxyStreamUrl.replace(/^\//, "/");
        const token = accessToken ? `?token=${encodeURIComponent(accessToken)}` : "";
        return `${base}${path}${token}`;
    }, [clip?.proxyStreamUrl, accessToken]);

    const directSrc = clip?.streamUrl || "";
    const videoSrc = videoSrcError ? proxySrc : (directSrc || proxySrc);

    // ---- Status branch ----
    const status = clip?.status;
    const segmentsReady = segments.length > 0;
    const isReady = status === "ready" && segmentsReady;
    const isProcessing = !isReady && !loadError && status !== "failed";
    const failed = status === "failed";

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-28">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
                {/* Top bar */}
                <div className="flex items-center gap-3 mb-3">
                    <Link href="/shadowing" className="text-slate-400 hover:text-white text-sm">
                        ← All clips
                    </Link>
                    <div className="flex-1" />
                    <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                            isReady
                                ? "bg-emerald-500/20 text-emerald-300"
                                : failed
                                ? "bg-red-500/20 text-red-300"
                                : "bg-amber-500/20 text-amber-300"
                        }`}
                    >
                        {status || "loading"}
                    </span>
                </div>
                <h1 className="text-lg sm:text-xl font-semibold truncate mb-4">
                    {clip?.title || clip?.youtubeUrl || "Shadowing clip"}
                </h1>

                {/* Top-level state branches */}
                {loadError && (
                    <ErrorPanel
                        title="Could not load this shadowing clip"
                        detail={loadError}
                        onRetry={() => router.reload()}
                    />
                )}

                {!loadError && failed && (
                    <ErrorPanel
                        title="ประมวลผลล้มเหลว"
                        detail={clip?.errorMessage || "Unknown error"}
                        onRetry={() => router.reload()}
                    />
                )}

                {/* Main 2-column grid (mobile collapses to single column). */}
                {!loadError && !failed && (
                    <div className={`grid gap-4 ${largeVideo ? "lg:grid-cols-[1fr_320px]" : "lg:grid-cols-[1.6fr_1fr]"}`}>
                        {/* LEFT: video + practice */}
                        <div className="space-y-4">
                            {/* Video */}
                            <div className="aspect-video rounded-2xl overflow-hidden bg-black shadow-xl ring-1 ring-slate-800 relative">
                                {isProcessing && !directSrc && !proxySrc && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                                        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
                                        <p className="text-sm text-amber-200">Video is still processing…</p>
                                        <p className="text-xs text-slate-400 mt-1">Transcript will appear when ready.</p>
                                    </div>
                                )}

                                {usingEmbed && clip?.youtubeId && (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${clip.youtubeId}`}
                                        className="w-full h-full"
                                        allow="autoplay; encrypted-media"
                                        allowFullScreen
                                    />
                                )}

                                {!usingEmbed && videoSrc && (
                                    <video
                                        ref={videoRef}
                                        src={videoSrc}
                                        controls
                                        playsInline
                                        className="w-full h-full"
                                        onError={() => {
                                            // If the presigned URL failed, fall back to the proxy.
                                            if (!videoSrcError && proxySrc) setVideoSrcError(true);
                                        }}
                                    />
                                )}

                                {!usingEmbed && !videoSrc && (
                                    <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">
                                        Video file found, waiting for playable URL…
                                    </div>
                                )}
                            </div>

                            {/* Practice sentence card */}
                            {isReady && currentSeg ? (
                                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
                                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                                        <span>Sentence {currentIdx + 1} / {segments.length}</span>
                                        <span>
                                            {currentSeg.startTime.toFixed(1)}s — {currentSeg.endTime.toFixed(1)}s
                                        </span>
                                    </div>
                                    <p className="text-xl sm:text-2xl leading-relaxed font-medium">{currentSeg.text}</p>
                                    {translations[currentSeg.id] && (
                                        <p className="mt-2 text-sm text-emerald-300">🇹🇭 {translations[currentSeg.id]}</p>
                                    )}

                                    {/* Primary controls */}
                                    <div className="grid grid-cols-4 gap-2 mt-4">
                                        <button onClick={onPrev} className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium">
                                            ⏮ Prev
                                        </button>
                                        <button onClick={onReplay} className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold">
                                            🔁 Replay
                                        </button>
                                        <button onClick={onPlayPause} className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium">
                                            ▶ Play
                                        </button>
                                        <button onClick={onNext} className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium">
                                            Next ⏭
                                        </button>
                                    </div>

                                    {/* Settings row */}
                                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
                                        <button
                                            onClick={() => fetchTranslation(currentSeg)}
                                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                                        >
                                            🇹🇭 แปลประโยคนี้
                                        </button>
                                        <label className="inline-flex items-center gap-1">
                                            <input type="checkbox" checked={autoPause} onChange={(e) => setAutoPause(e.target.checked)} />
                                            auto-stop
                                        </label>
                                        <label className="inline-flex items-center gap-1">
                                            <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
                                            loop
                                        </label>
                                        <label className="inline-flex items-center gap-1">
                                            <input type="checkbox" checked={largeVideo} onChange={(e) => setLargeVideo(e.target.checked)} />
                                            large video
                                        </label>
                                        <label className="inline-flex items-center gap-1">
                                            speed
                                            <select
                                                value={speed}
                                                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                                                className="bg-slate-800 rounded px-1"
                                            >
                                                <option value="0.5">0.5×</option>
                                                <option value="0.75">0.75×</option>
                                                <option value="1">1×</option>
                                                <option value="1.25">1.25×</option>
                                            </select>
                                        </label>
                                        <span className="text-[10px] text-slate-500 ml-auto">
                                            ⌨ ← prev · → next · R replay · space play/pause
                                        </span>
                                    </div>

                                    {/* Recording area */}
                                    <div className="mt-4 rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>Record yourself saying this sentence.</span>
                                            {recordings.length > 0 && <span>{recordings.length} saved</span>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            {!isRecording ? (
                                                <button
                                                    onClick={startRecording}
                                                    className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-sm font-semibold"
                                                >
                                                    🎙 Record
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={stopRecording}
                                                    className="px-4 py-2 rounded-xl bg-red-700 text-white text-sm font-semibold animate-pulse"
                                                >
                                                    ■ Stop
                                                </button>
                                            )}
                                            {recordingUrl && (
                                                <>
                                                    <audio controls src={recordingUrl} className="h-8" />
                                                    <button
                                                        onClick={uploadAndScore}
                                                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm"
                                                    >
                                                        Save + AI grade
                                                    </button>
                                                </>
                                            )}
                                            {score && (
                                                <div className="ml-auto text-xs text-right">
                                                    <div className="text-emerald-300 font-bold text-base">
                                                        Score: {Math.round(score.score * 100)}%
                                                    </div>
                                                    <div className="text-slate-400 max-w-[220px]">{score.feedback}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : isProcessing ? (
                                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 text-center">
                                    <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                    <p className="text-sm text-amber-200">Processing your clip…</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Gemini is generating sentence-aligned transcript and Thai translation.
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 text-sm text-slate-400">
                                    No transcript available yet.
                                </div>
                            )}

                            {/* Notes */}
                            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4">
                                <h2 className="text-sm font-medium mb-2">โน้ตของคุณ</h2>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="จดสำนวน คำศัพท์ หรือสิ่งที่อยากกลับมาทบทวน..."
                                    className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700 text-sm outline-none focus:border-indigo-400 min-h-[60px]"
                                />
                                <button
                                    onClick={saveNote}
                                    className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm"
                                >
                                    บันทึก {currentSeg ? "(ผูกกับประโยคนี้)" : ""}
                                </button>
                                <ul className="mt-3 space-y-1 text-xs text-slate-300">
                                    {notes.map((n) => (
                                        <li key={n.id} className="border-l-2 border-indigo-500 pl-2">
                                            {n.noteText}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* RIGHT: transcript panel */}
                        <aside className="rounded-2xl bg-slate-900/60 border border-slate-800 self-start lg:sticky lg:top-4 max-h-[calc(100vh-160px)] overflow-y-auto">
                            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
                                <span>Transcript</span>
                                {segmentsReady && (
                                    <span>
                                        {currentIdx + 1} / {segments.length}
                                    </span>
                                )}
                            </div>
                            {!segmentsReady && (
                                <div className="p-6 text-center text-sm text-slate-400">
                                    {isProcessing ? "Generating transcript…" : "No transcript yet."}
                                </div>
                            )}
                            <div>
                                {segments.map((seg, idx) => (
                                    <button
                                        key={seg.id}
                                        onClick={() => jumpTo(idx)}
                                        className={`w-full text-left px-4 py-3 text-sm border-l-4 transition ${
                                            idx === currentIdx
                                                ? "bg-indigo-500/15 border-indigo-400 text-white"
                                                : "border-transparent text-slate-300 hover:bg-white/5"
                                        }`}
                                    >
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-[10px] text-slate-500 shrink-0">#{idx + 1}</span>
                                            <span className="flex-1">{seg.text}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                                            <span>{seg.startTime.toFixed(1)}s</span>
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    void fetchTranslation(seg);
                                                }}
                                                className="cursor-pointer text-slate-400 hover:text-emerald-300"
                                            >
                                                {translations[seg.id] ? "ซ่อนคำแปล" : "🇹🇭 แปล"}
                                            </span>
                                        </div>
                                        {translations[seg.id] && (
                                            <p className="text-emerald-300 text-xs mt-1">{translations[seg.id]}</p>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </aside>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}

function ErrorPanel({
    title,
    detail,
    onRetry,
}: {
    title: string;
    detail: string;
    onRetry: () => void;
}) {
    return (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-6 text-center">
            <p className="text-red-300 font-medium">{title}</p>
            <p className="text-xs text-red-200/80 mt-2 break-words">{detail}</p>
            <div className="mt-4 flex gap-2 justify-center">
                <button
                    onClick={onRetry}
                    className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-sm font-medium"
                >
                    Retry
                </button>
                <Link
                    href="/shadowing"
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium"
                >
                    Back to clips
                </Link>
            </div>
        </div>
    );
}
