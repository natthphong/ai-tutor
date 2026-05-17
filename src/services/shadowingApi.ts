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
    errorMessage?: string;
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

export async function listShadowingClips(limit = 30) {
    const { data } = await axios.get<ApiResponse<{ clips: ShadowingClip[] }>>(
        `/v1/shadowing/clips?limit=${limit}`,
    );
    return unwrapResponse(data).clips || [];
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
