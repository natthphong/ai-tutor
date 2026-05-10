// src/services/tutorApi.ts
import axios, { type ApiResponse } from "@/utils/apiClient";
import { unwrapResponse } from "@/services/api";
import type {
    TutorSession,
    TutorStep,
    ListeningResult,
    SpeakingResult,
    ReadingResult,
    FlashcardReviewResult,
    DueItems,
    ProgressData,
} from "@/types/tutor";

const BASE = "/v1";

export async function loginWithLine(lineProfile: {
    userId: string;
    displayName?: string | null;
    pictureUrl?: string | null;
}) {
    const { data } = await axios.post<ApiResponse<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; lineUserId: string; displayName: string; pictureUrl?: string };
    }>>(`${BASE}/auth/line-login`, { lineProfile });
    return unwrapResponse(data);
}

export async function startSession(userId: string, preferredMode?: string, displayName?: string) {
    const { data } = await axios.post<ApiResponse<TutorSession>>(`${BASE}/tutor/sessions/start`, {
        userId,
        preferredMode: preferredMode || "mixed",
        displayName,
    });
    return unwrapResponse(data);
}

export async function getNextStep(sessionId: string, userId: string) {
    const { data } = await axios.post<ApiResponse<TutorStep>>(
        `${BASE}/tutor/sessions/${sessionId}/next`,
        { userId }
    );
    return unwrapResponse(data);
}

export async function submitListeningAnswer(sessionId: string, userId: string, answer: string, lessonItemId?: string) {
    const { data } = await axios.post<ApiResponse<ListeningResult>>(
        `${BASE}/tutor/sessions/${sessionId}/listening/answer`,
        { userId, answer, lessonItemId }
    );
    return unwrapResponse(data);
}

export async function submitSpeakingAudio(sessionId: string, userId: string, audioBlob: Blob) {
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("file", audioBlob, "recording.webm");
    const { data } = await axios.post<ApiResponse<SpeakingResult>>(
        `${BASE}/tutor/sessions/${sessionId}/speaking/audio`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
    );
    return unwrapResponse(data);
}

export async function submitReadingAnswer(sessionId: string, userId: string, translation: string, lessonItemId?: string) {
    const { data } = await axios.post<ApiResponse<ReadingResult>>(
        `${BASE}/tutor/sessions/${sessionId}/reading/answer`,
        { userId, translation, lessonItemId }
    );
    return unwrapResponse(data);
}

export async function getDueReviews(userId: string) {
    const { data } = await axios.get<ApiResponse<DueItems>>(`${BASE}/tutor/due?userId=${userId}`);
    return unwrapResponse(data);
}

export async function reviewFlashcard(flashcardId: string, userId: string, score: number) {
    const { data } = await axios.post<ApiResponse<FlashcardReviewResult>>(
        `${BASE}/tutor/reviews/flashcards/${flashcardId}/answer`,
        { userId, score }
    );
    return unwrapResponse(data);
}

export async function getProgress(userId: string) {
    const { data } = await axios.get<ApiResponse<ProgressData>>(`${BASE}/progress?userId=${userId}`);
    return unwrapResponse(data);
}

export async function synthesizeTTS(text: string) {
    const response = await axios.post(`${BASE}/voice/tts`, { text }, { responseType: "blob" });
    return URL.createObjectURL(response.data);
}

export async function ingestLessons() {
    const { data } = await axios.post<ApiResponse<{ count: number }>>(`${BASE}/admin/lessons/ingest`);
    return unwrapResponse(data);
}
