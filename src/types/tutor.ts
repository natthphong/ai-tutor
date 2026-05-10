// src/types/tutor.ts

export type TutorUser = {
    id: string;
    lineUserId: string;
    displayName: string;
    pictureUrl?: string;
};

export type TutorSession = {
    sessionId: string;
    nextAction: string;
    mode: string;
    unit: { unitNo: number; title: string };
    message?: { role: string; content: string; contentTh: string }; // Optional legacy fallback
    messages?: { role: string; content: string; contentTh: string; type?: string }[];
    dueItems: DueItems;
};

export type DueItems = {
    vocabularyDueCount: number;
    weaknessDueCount: number;
    unitReviewDueCount: number;
};

export type TutorStep = {
    sessionId: string;
    unitId: number;
    mode: string;
    nextAction: string;
    instruction?: string;
    passage?: string;
    pattern?: string;
    audioUrl?: string;
    explanation?: Record<string, unknown>;
};

export type ListeningResult = {
    isCorrect: boolean;
    score: number;
    feedbackTh: string;
    correction?: string;
    mistakes?: { type: string; value?: string }[];
    hint?: string;
    nextAction: string;
};

export type SpeakingResult = {
    transcript: string;
    score: number;
    feedbackTh: string;
    correction?: string;
    correctionTh?: string;
    mistakes?: { type: string; code?: string; detail?: string }[];
    nextAction: string;
    level?: string;
    sttProvider?: string;
    sttConfidence?: number;
};

export type ReadingResult = {
    score: number;
    feedbackTh: string;
    aiTranslation?: string;
    vocabulary?: { word: string; meaningTh: string; example?: string; exampleTh?: string }[];
    mistakes?: { type: string; detail?: string }[];
    nextAction: string;
    createdFlashcards?: number;
};

export type FlashcardReviewResult = {
    result: string;
    nextDueAt: string;
    masteryScore: number;
    level: string;
};

export type ProgressData = {
    currentUnit: number;
    completedUnits: number;
    streak: number;
    dueToday: { vocabulary: number; weakness: number; unit: number };
    scores: { listening: number; speaking: number; reading: number };
    topWeaknesses: string[];
};

export type ChatMessage = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    contentTh?: string;
    type: "text" | "audio" | "correction" | "hint" | "result" | "loading";
    audioUrl?: string;
    result?: ListeningResult | SpeakingResult | ReadingResult;
    timestamp: number;
};
