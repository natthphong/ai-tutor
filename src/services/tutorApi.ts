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
    TutorAction,
    TutorTurnResponse,
    ReviewFlashcardItem,
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

export async function submitTutorTurn(
    sessionId: string,
    userId: string,
    text: string,
    inputKind: "text" | "audio" = "text",
    clientAction?: TutorAction
) {
    const { data } = await axios.post<ApiResponse<TutorTurnResponse>>(
        `${BASE}/tutor/sessions/${sessionId}/turn`,
        { userId, text, inputKind, clientAction }
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

export async function submitSpeakingText(sessionId: string, userId: string, text: string) {
    const { data } = await axios.post<ApiResponse<SpeakingResult>>(
        `${BASE}/tutor/sessions/${sessionId}/speaking/text`,
        { userId, text }
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

export async function getReviewFlashcards(userId: string, limit = 20) {
    const { data } = await axios.get<ApiResponse<{ cards: ReviewFlashcardItem[] }>>(
        `${BASE}/tutor/reviews/flashcards?userId=${encodeURIComponent(userId)}&limit=${limit}`
    );
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
    // Force audio/wav type as Gemini typically returns WAV
    const audioBlob = new Blob([response.data], { type: "audio/wav" });
    return URL.createObjectURL(audioBlob);
}

export async function ingestLessons() {
    const { data } = await axios.post<ApiResponse<{ count: number }>>(`${BASE}/admin/lessons/ingest`);
    return unwrapResponse(data);
}

// Lesson chat history + per-unit progress so refresh keeps the chat alive.
export type LessonChatMessage = {
    role: "user" | "assistant" | "system";
    content: string;
    contentTh?: string;
    type?: string;
};

export async function getLessonChat(lessonId: number | string, userId?: string) {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    const { data } = await axios.get<ApiResponse<{ lessonId: number; messages: LessonChatMessage[] }>>(
        `${BASE}/lessons/${lessonId}/chat${qs}`,
    );
    return unwrapResponse(data);
}

export async function appendLessonChat(
    lessonId: number | string,
    message: LessonChatMessage & { sessionId?: string; userId?: string; metadata?: Record<string, unknown> },
) {
    const { data } = await axios.post<ApiResponse<{ ok: boolean }>>(
        `${BASE}/lessons/${lessonId}/chat`,
        message,
    );
    return unwrapResponse(data);
}

export async function getLessonProgress(lessonId: number | string, userId?: string) {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    const { data } = await axios.get<ApiResponse<any>>(`${BASE}/lessons/${lessonId}/progress${qs}`);
    return unwrapResponse(data);
}
