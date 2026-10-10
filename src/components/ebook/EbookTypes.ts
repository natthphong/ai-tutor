export type LearningState = "unlearned" | "learning" | "learned" | "review";

export type EbookLevel = "A1" | "A2" | "B1" | "B2";

export type EbookUnit = {
  id: string;
  number: number;
  title: string;
  title_th?: string;
  level?: EbookLevel;
  path_order?: number;
  theme_th?: string;
  lesson_page: number;
  exercise_page: number;
  answer_pages?: number[];
  sections: { id: string; item_ids: string[] }[];
};

export type EbookProgress = {
  page?: number;
  answers?: Record<string, string>;
  exercise_correct?: number;
  exercise_total?: number;
  exercises_completed?: boolean;
  speaking_completed?: boolean;
  listening_completed?: boolean;
  current_step?: number;
  completed_steps?: Record<string, boolean>;
  quiz_answers?: Record<string, string>;
  quiz_scores?: Record<string, number | boolean>;
  listening_scores?: Record<string, boolean>;
  vocabulary_saved?: Record<string, boolean>;
  learned?: boolean;
  completed_at?: string;
  review_requested?: boolean;
  review_due?: boolean;
  percent?: number;
  learning_state?: LearningState;
  active_step?: string;
  [key: string]: unknown;
};

export type EbookCatalog = {
  title: string;
  version: string;
  page_count: number;
  units: EbookUnit[];
  progress: Record<string, EbookProgress>;
  cursor?: { unit_id?: string; page?: number };
  recommended_unit_id?: string;
  path?: EbookPath;
};

export type EbookPath = {
  total: number;
  learned: number;
  review?: number;
  levels: { level: EbookLevel; total: number; learned: number }[];
};

export type EbookWord = {
  term: string;
  meaning: string;
  example: string;
  example_th?: string;
  part_of_speech?: string;
};

export type EbookExample = {
  sentence: string;
  meaning: string;
  audio_id?: string;
  source_page?: number;
};

export type EbookOption = { id: string; text: string };

export type EbookQuestion = {
  id: string;
  kind: "write" | "match" | "choice" | "fill" | "reorder" | "fix" | "translate";
  prompt: string;
  instruction_th: string;
  options: EbookOption[];
  /** Shuffled words of a reorder item; empty for every other kind. */
  tokens?: string[];
  answers?: string[];
  example?: boolean;
};

export type EbookStep = {
  id: string;
  title: string;
  status?: "complete" | "active" | "locked" | "available";
  quiz?: EbookQuestion | null;
  description?: string;
};

export type EbookShadowLine = {
  sentence: string;
  meaning: string;
  source_page?: number;
  audio_id?: string;
};

/** A line the learner hears before reading it. */
export type EbookListeningItem = {
  id: string;
  sentence: string;
  question_th: string;
  options: EbookOption[];
};

export type EbookForm = { label: string; pattern: string; sentence: string; meaning: string };

export type EbookMistake = { wrong: string; right: string; why_th: string };

export type EbookOriginalBook = {
  available?: boolean;
  page: number;
  label: string;
  exercise_page?: number;
};

export type EbookPack = {
  explanation: string;
  goal: string;
  pattern: string;
  notes: string[];
  title_th?: string;
  level?: EbookLevel;
  theme_th?: string;
  forms: EbookForm[];
  signal_words: string[];
  common_mistakes: EbookMistake[];
  compare_th: string;
  listening_items: EbookListeningItem[];
  speaking_criteria: string[];
  examples: EbookExample[];
  vocabulary: EbookWord[];
  questions: EbookQuestion[];
  concept_steps: EbookStep[];
  original_book: EbookOriginalBook;
  shadowing_sentences: EbookShadowLine[];
  speaking_prompt: string;
  speaking_th: string;
  useful_phrases: string[];
  version?: string;
  is_redesigned: boolean;
};

export type EbookDetail = {
  unit: EbookUnit;
  version: string;
  status: string;
  pack: EbookPack;
  progress: EbookProgress;
};

export type QuizMark = {
  id: string;
  correct: boolean;
  reason_th: string;
  answer: string;
};

const GUIDED_COURSE_VERSIONS = ["2026-10-10.v2", "2026-09-20.v1"];

export function isGuidedCourseId(id: string): boolean {
  return /^ebook-\d{3}$/.test(id);
}

/**
 * Stable ebook-### IDs are the public identity of the bundled guided course.
 * Keep this catalog-level check separate from pack shape: a response can lose
 * convenience fields during a deploy, but it must never fall back to the
 * private PDF worksheet when the guided catalog is selected.
 */
export function isGuidedCatalog(catalog: EbookCatalog): boolean {
  return GUIDED_COURSE_VERSIONS.includes(catalog.version) || (
    catalog.units.length > 0 && catalog.units.every((unit) => isGuidedCourseId(unit.id))
  );
}

const STEP_FALLBACKS = [
  { id: "understand", title: "Understand" },
  { id: "examples", title: "Examples" },
  { id: "quiz", title: "Quick practice" },
  { id: "shadowing", title: "Listen & shadow" },
  { id: "speaking", title: "Use it" },
] as const;

const LEARNING_STATES: LearningState[] = [
  "unlearned",
  "learning",
  "learned",
  "review",
];

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function exactText(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value;
  return text(value, fallback);
}

function number(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown): boolean {
  return value === true;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function firstText(source: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const candidate = text(source[key]);
    if (candidate) return candidate;
  }
  return fallback;
}

function firstUnknown(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
}

const LEVELS: EbookLevel[] = ["A1", "A2", "B1", "B2"];

function normalizeLevel(value: unknown): EbookLevel | undefined {
  return LEVELS.includes(value as EbookLevel) ? (value as EbookLevel) : undefined;
}

function normalizeUnit(raw: unknown, index: number): EbookUnit {
  const source = asRecord(raw);
  const sections = asArray(source.sections).map((section, sectionIndex) => {
    const value = asRecord(section);
    return {
      id: firstText(value, ["id", "section_id"], `${index + 1}.${sectionIndex + 1}`),
      item_ids: asArray(value.item_ids).map((id) => text(id)).filter(Boolean),
    };
  });
  return {
    id: firstText(source, ["id", "unit_id"], `unit-${String(index + 1).padStart(3, "0")}`),
    number: number(source.number ?? source.ordinal, index + 1),
    title: firstText(source, ["title", "name"], `Unit ${index + 1}`),
    title_th: firstText(source, ["title_th"]) || undefined,
    level: normalizeLevel(source.level),
    path_order: number(source.path_order, 0) || undefined,
    theme_th: firstText(source, ["theme_th"]) || undefined,
    lesson_page: number(source.lesson_page ?? source.page, 1),
    exercise_page: number(source.exercise_page, number(source.lesson_page ?? source.page, 1)),
    answer_pages: asArray(source.answer_pages)
      .map((page) => number(page, 0))
      .filter((page) => page > 0),
    sections,
  };
}

function mergeProgress(raw: unknown): EbookProgress {
  const source = asRecord(raw);
  const state = asRecord(source.state);
  const value = { ...state, ...source } as EbookProgress;
  if (source.progress && typeof source.progress === "object") {
    Object.assign(value, asRecord(source.progress));
  }
  if (value.answers && typeof value.answers !== "object") delete value.answers;
  if (value.quiz_answers && typeof value.quiz_answers !== "object") delete value.quiz_answers;
  if (value.completed_steps && typeof value.completed_steps !== "object") delete value.completed_steps;
  return value;
}

export function deriveLearningState(raw: unknown): LearningState {
  const progress = mergeProgress(raw);
  const direct = firstText(progress, ["learning_state", "learningState", "status"]);
  if (LEARNING_STATES.includes(direct as LearningState)) return direct as LearningState;
  if (bool(progress.review_requested) || bool(progress.review_due)) return "review";
  if (bool(progress.learned) || bool(progress.exercises_completed && progress.speaking_completed && progress.listening_completed)) {
    return "learned";
  }
  const completed = asRecord(progress.completed_steps);
  const completedCount = Object.values(completed).filter(Boolean).length;
  const hasActivity = Boolean(
    progress.page ||
      progress.current_step ||
      progress.active_step ||
      Object.keys(asRecord(progress.answers)).length ||
      Object.keys(completed).length ||
      completedCount ||
      progress.exercise_correct ||
      progress.speaking_completed ||
      progress.listening_completed,
  );
  return hasActivity ? "learning" : "unlearned";
}

function normalizeOption(raw: unknown, index: number): EbookOption {
  if (typeof raw === "string") return { id: raw, text: raw };
  const source = asRecord(raw);
  const option = firstText(source, ["id", "value", "key"], String.fromCharCode(65 + index));
  return { id: option, text: firstText(source, ["text", "label", "value"], option) };
}

function normalizeQuestion(raw: unknown, index: number, prefix = "quiz"): EbookQuestion | null {
  const source = asRecord(raw);
  const prompt = firstText(source, ["prompt", "prompt_en", "question", "text", "instruction"]);
  if (!prompt) return null;
  const options = asArray(firstUnknown(source, ["options", "choices"])).map(normalizeOption);
  const rawAnswers = firstUnknown(source, ["answers", "accepted_answers", "acceptedAnswers"]);
  const answers = asArray(rawAnswers).map((answer) => text(answer)).filter(Boolean);
  const directAnswer = firstText(source, ["correct_answer", "correctAnswer", "answer"]);
  if (directAnswer && !answers.includes(directAnswer)) answers.push(directAnswer);
  return {
    id: firstText(source, ["id", "quiz_id"], `${prefix}-${index + 1}`),
    kind: (firstText(source, ["kind", "type"], options.length ? "choice" : "write") as EbookQuestion["kind"]),
    prompt,
    instruction_th: firstText(source, ["instruction_th", "prompt_th", "instructionThai", "hint_th"], "ลองตอบตามความหมาย"),
    options,
    tokens: asArray(source.tokens).map((token) => exactText(token)).filter(Boolean),
    answers: answers.length ? answers : undefined,
    example: bool(source.example),
  };
}

function normalizeQuestions(source: Record<string, unknown>, steps: EbookStep[]): EbookQuestion[] {
  const rawQuestions = [
    ...asArray(firstUnknown(source, ["questions", "quiz_items", "quizItems"])),
    ...asArray(source.quiz),
  ];
  for (const step of steps) if (step.quiz) rawQuestions.push(step.quiz);
  const seen = new Set<string>();
  return rawQuestions
    .map((question, index) => normalizeQuestion(question, index, "quiz"))
    .filter((question): question is EbookQuestion => {
      if (!question || seen.has(question.id)) return false;
      seen.add(question.id);
      return true;
    });
}

function normalizeExamples(source: Record<string, unknown>): EbookExample[] {
  const raw = firstUnknown(source, ["examples", "lesson_examples", "example_sentences"]);
  const values = asArray(raw);
  if (!values.length && typeof source.example === "string") values.push(source.example);
  return values
    .map((example) => {
      if (typeof example === "string") return { sentence: exactText(example), meaning: "" };
      const value = asRecord(example);
      return {
        sentence: exactText(firstUnknown(value, ["sentence", "english", "en", "text", "example", "text_en"])),
        meaning: firstText(value, ["meaning_th", "thai", "th", "translation", "meaning", "text_th"]),
        audio_id: firstText(value, ["audio_id", "audioId"]) || undefined,
        source_page: number(value.source_page ?? value.page, 0) || undefined,
      };
    })
    .filter((example) => Boolean(example.sentence));
}

function normalizeVocabulary(source: Record<string, unknown>): EbookWord[] {
  const seen = new Set<string>();
  return asArray(source.vocabulary)
    .map((word) => {
      const value = asRecord(word);
      return {
        term: firstText(value, ["term", "word", "phrase"]),
        meaning: firstText(value, ["meaning_th", "meaning", "thai", "th"]),
        example: firstText(value, ["example", "example_sentence", "example_en", "sentence"]),
        example_th: firstText(value, ["example_th"]) || undefined,
        part_of_speech: firstText(value, ["part_of_speech", "pos"]) || undefined,
      };
    })
    .filter((word) => {
      const key = word.term.toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function normalizeSteps(source: Record<string, unknown>): EbookStep[] {
  const values = asArray(source.concept_steps ?? source.steps);
  const normalized = values.slice(0, 5).map((step, index) => {
    const value = asRecord(step);
    const title = firstText(value, ["title", "label"], STEP_FALLBACKS[index]?.title || `Step ${index + 1}`);
    const quiz = value.quiz ? normalizeQuestion(value.quiz, index, `step-${index + 1}`) : null;
    return {
      id: firstText(value, ["id", "key"], slug(title) || STEP_FALLBACKS[index]?.id || `step-${index + 1}`),
      title,
      status: (firstText(value, ["status"]) as EbookStep["status"]) || undefined,
      quiz,
      description: firstText(value, ["description", "description_th", "summary"]) || undefined,
    };
  });
  return STEP_FALLBACKS.map((fallback, index) => normalized[index] || { id: fallback.id, title: fallback.title });
}

function normalizeShadowing(source: Record<string, unknown>, examples: EbookExample[]): EbookShadowLine[] {
  const raw = firstUnknown(source, ["shadowing_sentences", "shadowing", "shadow_lines"]);
  const values = asArray(raw);
  const lines = values
    .map((line) => {
      if (typeof line === "string") {
        const example = examples.find((candidate) => candidate.sentence === line);
        return { sentence: exactText(line), meaning: example?.meaning || "" };
      }
      const value = asRecord(line);
      return {
        sentence: exactText(firstUnknown(value, ["lesson_example", "sentence", "english", "text"])),
        meaning: firstText(value, ["meaning_th", "meaning", "thai", "translation"]),
        source_page: number(value.source_page ?? value.page, 0) || undefined,
        audio_id: firstText(value, ["audio_id", "audioId"]) || undefined,
      };
    })
    .filter((line) => Boolean(line.sentence));
  // Course v2 shadows the lines the learner just heard, which are not lesson
  // examples. Older packs list example sentences without their meaning.
  const exampleSentences = new Set(examples.map((example) => example.sentence));
  if (!examples.length || (lines.length > 0 && lines.some((line) => !exampleSentences.has(line.sentence)))) return lines.slice(0, 3);
  const sourceBySentence = new Map(lines.map((line) => [line.sentence, line]));
  return examples.slice(0, 3).map((example) => {
    const source = sourceBySentence.get(example.sentence);
    return {
      sentence: example.sentence,
      meaning: example.meaning,
      source_page: source?.source_page || example.source_page,
      audio_id: source?.audio_id || example.audio_id,
    };
  });
}

function normalizeListening(source: Record<string, unknown>): EbookListeningItem[] {
  return asArray(source.listening_items)
    .map((item, index) => {
      const value = asRecord(item);
      return {
        id: firstText(value, ["id"], `listen-${String(index + 1).padStart(2, "0")}`),
        sentence: exactText(firstUnknown(value, ["sentence", "audio_en"])),
        question_th: firstText(value, ["question_th"]),
        options: asArray(firstUnknown(value, ["options", "options_th"])).map(normalizeOption),
      };
    })
    .filter((item) => Boolean(item.sentence) && item.options.length > 0);
}

function normalizeForms(source: Record<string, unknown>): EbookForm[] {
  return asArray(source.forms)
    .map((form) => {
      const value = asRecord(form);
      return {
        label: firstText(value, ["label", "label_th"]),
        pattern: firstText(value, ["pattern"]),
        sentence: exactText(firstUnknown(value, ["sentence", "example_en"])),
        meaning: firstText(value, ["meaning", "example_th"]),
      };
    })
    .filter((form) => Boolean(form.pattern || form.sentence));
}

function normalizeMistakes(source: Record<string, unknown>): EbookMistake[] {
  return asArray(source.common_mistakes)
    .map((mistake) => {
      const value = asRecord(mistake);
      return { wrong: exactText(value.wrong), right: exactText(value.right), why_th: firstText(value, ["why_th", "why"]) };
    })
    .filter((mistake) => Boolean(mistake.wrong && mistake.right));
}

function normalizeBook(source: Record<string, unknown>, unit: EbookUnit): EbookOriginalBook {
  const unitSource = asRecord(source.unit);
  const value = asRecord(source.original_book ?? source.originalBook ?? unitSource.original_book ?? unitSource.originalBook);
  return {
    available: value.available !== false,
    page: number(value.page, unit.lesson_page),
    label: firstText(value, ["label", "title"], "Original Book"),
    exercise_page: number(value.exercise_page, unit.exercise_page),
  };
}

function looksLikeConceptTag(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase();
  return Boolean(
    /^unit-\d+$/.test(normalized) ||
      /^[a-z0-9]+(?:[_-][a-z0-9]+)+$/.test(normalized) ||
      /^\([^)]*\)$/.test(normalized) ||
      /^[a-z]+(?: [a-z]+)? \([^)]*\)$/.test(normalized),
  );
}

function normalizeUsefulPhrases(source: Record<string, unknown>): string[] {
  return asArray(firstUnknown(source, ["useful_phrases", "phrases"]))
    .map((phrase) => text(phrase))
    .filter((phrase) => Boolean(phrase) && !looksLikeConceptTag(phrase));
}

export function normalizePack(raw: unknown, unit: EbookUnit): EbookPack {
  const wrapper = asRecord(raw);
  const legacy = asRecord(wrapper.pack);
  const lesson = asRecord(wrapper.lesson ?? wrapper.course ?? wrapper.content);
  const source = { ...legacy, ...lesson, ...wrapper };
  const examples = normalizeExamples(source);
  const steps = normalizeSteps(source);
  const questions = normalizeQuestions(source, steps);
  const speaking = asRecord(source.speaking);
  return {
    explanation: firstText(source, ["explanation_th", "explanation", "explanationThai", "description"], "เริ่มจากความหมาย แล้วค่อยนำ pattern ไปใช้ในสถานการณ์ของคุณ"),
    goal: firstText(source, ["goal_th", "goal", "objective", "practical_goal", "speaking_goal"], "ใช้ pattern นี้สื่อสารเรื่องใกล้ตัวได้อย่างมั่นใจ"),
    pattern: firstText(source, ["pattern", "grammar_pattern"], "ลองใช้ pattern นี้กับข้อมูลของคุณเอง"),
    notes: asArray(firstUnknown(source, ["notes", "supporting_notes", "pattern_notes"]))
      .map((note) => text(note))
      .filter(Boolean),
    title_th: firstText(source, ["title_th"]) || undefined,
    level: normalizeLevel(source.level),
    theme_th: firstText(source, ["theme_th"]) || undefined,
    forms: normalizeForms(source),
    signal_words: asArray(source.signal_words).map((word) => text(word)).filter(Boolean),
    common_mistakes: normalizeMistakes(source),
    compare_th: firstText(source, ["compare_th"]),
    listening_items: normalizeListening(source),
    speaking_criteria: asArray(firstUnknown(source, ["speaking_criteria"])).map((item) => text(item)).filter(Boolean),
    examples,
    vocabulary: normalizeVocabulary(source),
    questions,
    concept_steps: steps,
    original_book: normalizeBook(source, unit),
    shadowing_sentences: normalizeShadowing(source, examples),
    speaking_prompt: firstText(source, ["speaking_prompt", "speaking_question", "opening_question"]) || firstText(speaking, ["prompt_en", "prompt", "question"], "ลองเล่าเรื่องของคุณโดยใช้ pattern นี้"),
    speaking_th: firstText(source, ["speaking_th", "speaking_prompt_th", "speaking_goal_th"]) || firstText(speaking, ["prompt_th", "goal_th", "meaning_th"]),
    useful_phrases: normalizeUsefulPhrases(source),
    version: firstText(source, ["version"]) || undefined,
    is_redesigned: Boolean(wrapper.lesson || wrapper.course || wrapper.content || source.concept_steps || source.shadowing_sentences || source.original_book),
  };
}

export function normalizeCatalog(raw: unknown): EbookCatalog {
  const source = asRecord(raw);
  const rawUnits = asArray(source.units);
  const units = rawUnits.map(normalizeUnit);
  const progressSource = asRecord(source.progress);
  const progress: Record<string, EbookProgress> = {};
  for (const [index, unit] of units.entries()) {
    const summary = asRecord(rawUnits[index]);
    const summaryProgress: EbookProgress = {};
    const status = firstText(summary, ["status", "learning_state"]);
    if (LEARNING_STATES.includes(status as LearningState)) summaryProgress.learning_state = status as LearningState;
    if (summary.percent !== undefined) summaryProgress.percent = number(summary.percent, 0);
    if (summary.current_step !== undefined) summaryProgress.current_step = number(summary.current_step, 1);
    if (summary.review_due !== undefined) summaryProgress.review_due = bool(summary.review_due);
    progress[unit.id] = { ...mergeProgress(progressSource[unit.id]), ...summaryProgress };
  }
  for (const [id, value] of Object.entries(progressSource)) if (!progress[id]) progress[id] = mergeProgress(value);
  const cursor = asRecord(source.cursor);
  return {
    title: firstText(source, ["title", "name"], "Learn Ebook"),
    version: firstText(source, ["version"], "ebook-course-v1"),
    page_count: number(source.page_count, 392),
    units,
    progress,
    cursor: {
      unit_id: firstText(cursor, ["unit_id", "unitId"]) || undefined,
      page: number(cursor.page, 0) || undefined,
    },
    recommended_unit_id: firstText(source, ["recommended_unit_id"]) || undefined,
    path: normalizePath(source.path),
  };
}

function normalizePath(raw: unknown): EbookPath | undefined {
  const source = asRecord(raw);
  const levels = asArray(source.levels)
    .map((item) => {
      const value = asRecord(item);
      const level = normalizeLevel(value.level);
      return level ? { level, total: number(value.total, 0), learned: number(value.learned, 0) } : null;
    })
    .filter((item): item is { level: EbookLevel; total: number; learned: number } => Boolean(item));
  if (!levels.length) return undefined;
  return { total: number(source.total, 0), learned: number(source.learned, 0), review: number(source.review, 0), levels };
}

/** Units in the recommended learning order (A1 first) when the course provides one. */
export function inPathOrder(units: EbookUnit[]): EbookUnit[] {
  if (!units.every((unit) => unit.path_order)) return units;
  return [...units].sort((a, b) => (a.path_order || 0) - (b.path_order || 0));
}

/** True when every listen-first item of the unit has been answered correctly. */
export function isListeningDone(pack: EbookPack, progress: EbookProgress): boolean {
  const scores = progress.listening_scores || {};
  return pack.listening_items.every((item) => scores[item.id] === true);
}

export function normalizeDetail(raw: unknown, fallbackUnit?: EbookUnit): EbookDetail | null {
  const source = asRecord(raw);
  const unit = source.unit ? normalizeUnit(source.unit, 0) : fallbackUnit;
  if (!unit) return null;
  const progress = mergeProgress(source.progress);
  return {
    unit,
    version: firstText(source, ["version"], "ebook-course-v1"),
    status: firstText(source, ["status"], "ready"),
    pack: normalizePack(source, unit),
    progress,
  };
}

export function getActiveStepIndex(pack: EbookPack, progress: EbookProgress): number {
  const direct = number(progress.current_step, 0);
  if (direct >= 1 && direct <= 5) return direct - 1;
  const active = firstText(progress, ["active_step", "currentStep"]);
  if (active) {
    const activeSlug = slug(active);
    const index = pack.concept_steps.findIndex((step) => slug(step.id) === activeSlug || slug(step.title) === activeSlug);
    if (index >= 0) return index;
  }
  const completed = asRecord(progress.completed_steps);
  const index = pack.concept_steps.findIndex((step, i) => {
    const key = step.id || STEP_FALLBACKS[i].id;
    return !completed[key] && !completed[STEP_FALLBACKS[i].id];
  });
  return index >= 0 ? index : 0;
}

export function getProgressPercent(progress: EbookProgress): number {
  const direct = number(progress.percent, -1);
  if (direct >= 0) return Math.max(0, Math.min(100, direct));
  const completed = asRecord(progress.completed_steps);
  const count = Object.values(completed).filter(Boolean).length;
  if (count) return Math.round((count / 5) * 100);
  if (progress.exercises_completed && progress.speaking_completed && progress.listening_completed) return 100;
  return progress.page || progress.answers ? 20 : 0;
}

export function isLegacyPack(pack: EbookPack): boolean {
  return !pack.is_redesigned && pack.questions.length > 0;
}

export function mergeDetailProgress(detail: EbookDetail, progress: EbookProgress): EbookDetail {
  return { ...detail, progress: { ...detail.progress, ...progress } };
}
