// src/services/shadowingApi.ts
import axios, { type ApiResponse } from "@/utils/apiClient";
import { unwrapResponse } from "@/services/api";

export type ShadowingClip = {
    id: string;
    userId: string;
    youtubeUrl: string;
    youtubeId: string;
    title: string;
    thumbnailUrl: string;
    minioObjectKey?: string;
    streamUrl: string;
    proxyStreamUrl?: string;
    durationSeconds: number;
    status: "pending" | "processing" | "ready" | "failed";
    videoStatus?: "pending" | "processing" | "ready" | "failed";
    transcriptStatus?: "pending" | "processing" | "ready" | "failed";
    errorMessage?: string;
    folderId?: string;
    isCompleted?: boolean;
    watchedAt?: string | null;
    lastSegmentIndex?: number;
    lastWatchedTime?: number;
    createdAt: string;
    updatedAt: string;
};

export type ShadowingFolder = {
    id: string;
    name: string;
    color?: string;
    clipCount: number;
    createdAt: string;
    updatedAt: string;
};

export type ShadowingSegment = {
    id: string;
    index: number;
    startTime: number;
    endTime: number;
    text: string;
    thaiTranslation: string;
    ipa?: string;
};

export type ShadowingProgress = {
    currentSegmentIndex: number;
    lastWatchedTime: number;
    completedSegments: number[];
};

export type ShadowingDetail = {
    clip: ShadowingClip;
    segments: ShadowingSegment[] | null;
    progress: ShadowingProgress;
};

export async function createShadowingClip(youtubeUrl: string) {
    const { data } = await axios.post<ApiResponse<ShadowingClip>>("/v1/shadowing/clips", { youtubeUrl });
    return unwrapResponse(data);
}

export async function listShadowingClips(
    opts: { limit?: number; sort?: "recent" | "watched"; folderId?: string; unwatched?: boolean } = {},
) {
    const params = new URLSearchParams();
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.sort) params.set("sort", opts.sort);
    if (opts.folderId) params.set("folderId", opts.folderId);
    if (opts.unwatched) params.set("unwatched", "true");
    const { data } = await axios.get<ApiResponse<{ clips: ShadowingClip[] }>>(
        `/v1/shadowing/clips?${params.toString()}`,
    );
    return unwrapResponse(data).clips || [];
}

export async function markShadowingWatched(clipId: string, completed: boolean) {
    const { data } = await axios.post<ApiResponse<{ ok: boolean }>>(
        `/v1/shadowing/clips/${clipId}/mark-watched`,
        { completed },
    );
    return unwrapResponse(data);
}

export async function moveShadowingClipToFolder(clipId: string, folderId: string | null) {
    const { data } = await axios.post<ApiResponse<{ ok: boolean }>>(
        `/v1/shadowing/clips/${clipId}/folder`,
        { folderId: folderId || "" },
    );
    return unwrapResponse(data);
}

export async function listShadowingFolders() {
    const { data } = await axios.get<ApiResponse<{ folders: ShadowingFolder[] }>>(
        `/v1/shadowing/folders`,
    );
    return unwrapResponse(data).folders || [];
}

export async function createShadowingFolder(name: string, color?: string) {
    const { data } = await axios.post<ApiResponse<ShadowingFolder>>(
        `/v1/shadowing/folders`,
        { name, color },
    );
    return unwrapResponse(data);
}

export async function deleteShadowingFolder(folderId: string) {
    const { data } = await axios.delete<ApiResponse<{ ok: boolean }>>(
        `/v1/shadowing/folders/${folderId}`,
    );
    return unwrapResponse(data);
}

export async function getShadowingClip(clipId: string) {
    const { data } = await axios.get<ApiResponse<ShadowingDetail>>(`/v1/shadowing/clips/${clipId}`);
    return unwrapResponse(data);
}

export async function saveShadowingProgress(
    clipId: string,
    currentSegmentIndex: number,
    lastWatchedTime: number,
    completedSegments: number[],
) {
    const { data } = await axios.patch<ApiResponse<{ ok: boolean }>>(
        `/v1/shadowing/clips/${clipId}/progress`,
        { currentSegmentIndex, lastWatchedTime, completedSegments },
    );
    return unwrapResponse(data);
}

export async function uploadShadowingRecording(
    clipId: string,
    segmentId: string,
    blob: Blob,
    durationSeconds: number,
) {
    const fd = new FormData();
    fd.append("file", blob, "recording.webm");
    fd.append("durationSeconds", String(durationSeconds));
    const { data } = await axios.post<ApiResponse<{ id: string; audioUrl: string }>>(
        `/v1/shadowing/clips/${clipId}/segments/${segmentId}/recordings`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return unwrapResponse(data);
}

export async function listShadowingRecordings(clipId: string, segmentId: string) {
    const { data } = await axios.get<ApiResponse<{ recordings: any[] }>>(
        `/v1/shadowing/clips/${clipId}/segments/${segmentId}/recordings`,
    );
    return unwrapResponse(data).recordings || [];
}

export async function upsertShadowingNote(clipId: string, segmentId: string | null, noteText: string) {
    const { data } = await axios.post<ApiResponse<{ id: string }>>(
        `/v1/shadowing/clips/${clipId}/notes`,
        { segmentId: segmentId || "", noteText },
    );
    return unwrapResponse(data);
}

export async function listShadowingNotes(clipId: string) {
    const { data } = await axios.get<ApiResponse<{ notes: any[] }>>(`/v1/shadowing/clips/${clipId}/notes`);
    return unwrapResponse(data).notes || [];
}

// Returns cached Thai translation without re-calling Gemini.
export async function translateSegment(clipId: string, segmentId: string) {
    const { data } = await axios.get<ApiResponse<{ text: string; thaiTranslation: string; cached: boolean }>>(
        `/v1/shadowing/clips/${clipId}/segments/${segmentId}/translate`,
    );
    return unwrapResponse(data);
}

export async function scoreShadowingRecording(clipId: string, recordingId: string) {
    const { data } = await axios.post<ApiResponse<{ score: number; feedback: string }>>(
        `/v1/shadowing/clips/${clipId}/recordings/${recordingId}/score`,
        {},
    );
    return unwrapResponse(data);
}

// Re-runs Gemini transcript generation for an existing clip. Keeps id /
// streamUrl / progress / recordings / notes untouched.
export async function retryShadowingClip(clipId: string) {
    const { data } = await axios.post<ApiResponse<{ ok: boolean; clip: ShadowingClip }>>(
        `/v1/shadowing/clips/${clipId}/retry`,
        {},
    );
    return unwrapResponse(data);
}
