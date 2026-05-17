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
    availableActions?: TutorAction[];
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
    lessonItemId?: string;
    targetText?: string;
    ttsAvailable?: boolean;
    situation?: string;
};

export type TutorAction = "answer" | "hint" | "repeat" | "review" | "restart" | "continue";

export type TutorPractice = {
    lessonItemId?: string;
    targetText?: string;
    passage?: string;
    pattern?: string;
    ttsAvailable?: boolean;
};

export type TutorTurnResponse = {
    sessionId: string;
    unit?: { unitNo: number; title: string };
    unitId?: number;
    mode: string;
    intent: string;
    intentConfidence?: number;
    nextAction: string;
    messages?: { role: "user" | "assistant" | "system"; content: string; contentTh?: string; type?: ChatMessage["type"] }[];
    result?: ListeningResult | SpeakingResult | ReadingResult | Record<string, unknown>;
    practice?: TutorPractice;
    availableActions?: TutorAction[];
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
    grammarScore?: number;
    pronunciationScore?: number;
    fluencyScore?: number;
    nativeSuggestion?: string;
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

export type ReviewFlashcardItem = {
    id: string;
    front: string;
    back: string;
    example?: string;
    exampleTh?: string;
    cardType: string;
    masteryScore: number;
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
