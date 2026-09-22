"use client";

import { ArrowRight, BookOpen, Clock3, Lightbulb } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, post } from "@/lib/api";
import type { User } from "@/lib/types";
import { ErrorMessage, Loading } from "./ui";
import LessonConcept from "./ebook/LessonConcept";
import LessonExamples from "./ebook/LessonExamples";
import LessonQuiz from "./ebook/LessonQuiz";
import LessonCoach from "./ebook/LessonCoach";
import LessonShadowing from "./ebook/LessonShadowing";
import LessonStepper from "./ebook/LessonStepper";
import LessonUseIt from "./ebook/LessonUseIt";
import OriginalBookDialog from "./ebook/OriginalBookDialog";
import UnitNavigator, { type UnitFilter } from "./ebook/UnitNavigator";
import {
  deriveLearningState,
  getActiveStepIndex,
  isLegacyPack,
  mergeDetailProgress,
  normalizeCatalog,
  normalizeDetail,
  type EbookCatalog,
  type EbookDetail,
  type EbookProgress,
  type EbookQuestion,
  type EbookWord,
  type QuizMark,
} from "./ebook/EbookTypes";

type Draft = {
  id: string;
  version: string;
  page: number;
  answers: Record<string, string>;
  currentStep: number;
  completedSteps: Record<string, boolean>;
};

function progressStorage(userId: string, version: string, id: string) {
  return `toko-ebook:${userId}:${version}:${id}`;
}

const PROGRESS_STEP_IDS = ["understand", "examples", "quiz", "shadowing", "speaking"] as const;

export default function LearnEbook({
  user,
  resume,
  review,
}: {
  user: User;
  resume: (id: string) => void;
  review: () => void;
}) {
  const [book, setBook] = useState<EbookCatalog | null>(null);
  const [detail, setDetail] = useState<EbookDetail | null>(null);
  const [selected, setSelected] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UnitFilter>("all");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marks, setMarks] = useState<Record<string, QuizMark>>({});
  const [reveals, setReveals] = useState<Record<string, { answers: string[]; explanation_th: string }>>({});
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const draft = useRef<Draft>({ id: "", version: "", page: 1, answers: {}, currentStep: 1, completedSteps: {} });
  const saveChain = useRef(Promise.resolve());
  const quizRequest = useRef<{ fingerprint: string; requestId: string } | undefined>(undefined);

  async function saveDraft() {
    const snapshot = { ...draft.current, answers: { ...draft.current.answers } };
    if (!snapshot.id) return;
    const cachedDraft = JSON.stringify({ answers: snapshot.answers, currentStep: snapshot.currentStep, completedSteps: snapshot.completedSteps });
    const task = saveChain.current.catch(() => undefined).then(async () => {
      try {
        const result = await api<{ progress?: EbookProgress }>(`/ebook/units/${snapshot.id}/progress`, {
          method: "PATCH",
          body: JSON.stringify({ page: snapshot.page, answers: snapshot.answers, current_step: snapshot.currentStep, completed_steps: snapshot.completedSteps, quiz_answers: snapshot.answers }),
        });
        if (result.progress) {
          setDetail((current) => current && current.unit.id === snapshot.id ? { ...current, progress: { ...current.progress, ...result.progress } } : current);
          setBook((current) => current ? { ...current, progress: { ...current.progress, [snapshot.id]: { ...(current.progress[snapshot.id] || {}), ...result.progress } } } : current);
          if (draft.current.id === snapshot.id) {
            draft.current.currentStep = result.progress.current_step ?? draft.current.currentStep;
            draft.current.completedSteps = { ...draft.current.completedSteps, ...(result.progress.completed_steps || {}) };
          }
        }
        if (typeof window !== "undefined") {
          const key = progressStorage(user.id, snapshot.version, snapshot.id);
          const stored = localStorage.getItem(key);
          if (stored === cachedDraft) localStorage.removeItem(key);
        }
        setSaved("Saved");
      } catch (e) {
        if (typeof window !== "undefined") localStorage.setItem(progressStorage(user.id, snapshot.version, snapshot.id), cachedDraft);
        setSaved("Saved on this device; retrying when you reconnect");
        throw e;
      }
    });
    saveChain.current = task;
    await task;
  }

  async function openUnit(id: string, initialPage?: number, catalogSnapshot: EbookCatalog | null = book) {
    if (!catalogSnapshot) return;
    setBusy(true);
    setError("");
    try {
      if (selected && selected !== id) await saveDraft();
      const raw = await api<unknown>(`/ebook/units/${id}`);
      const unit = catalogSnapshot.units.find((candidate) => candidate.id === id);
      const next = normalizeDetail(raw, unit);
      if (!next) throw new Error("This unit is not available");
      const mergedProgress = { ...(catalogSnapshot.progress[id] || {}), ...next.progress };
      let nextAnswers = { ...(mergedProgress.answers || {}), ...(mergedProgress.quiz_answers || {}) };
      const key = progressStorage(user.id, next.version || catalogSnapshot.version, id);
      if (typeof window !== "undefined") {
        try {
          const local = JSON.parse(localStorage.getItem(key) || "null") as { answers?: Record<string, string>; currentStep?: number; completedSteps?: Record<string, boolean> } | null;
          if (local?.answers) nextAnswers = { ...nextAnswers, ...local.answers };
          if (local?.currentStep && local.currentStep >= 1 && local.currentStep <= 5) mergedProgress.current_step = local.currentStep;
          if (local?.completedSteps) mergedProgress.completed_steps = { ...(mergedProgress.completed_steps || {}), ...local.completedSteps };
        } catch {
          // Invalid local drafts should never block the lesson.
        }
      }
      const nextDetail = mergeDetailProgress(next, mergedProgress);
      const nextStep = getActiveStepIndex(nextDetail.pack, mergedProgress);
      const nextPage = initialPage || mergedProgress.page || next.unit.lesson_page;
      draft.current = { id, version: nextDetail.version || catalogSnapshot.version, page: nextPage, answers: nextAnswers, currentStep: nextStep + 1, completedSteps: { ...(mergedProgress.completed_steps || {}) } };
      setSelected(id);
      setDetail(nextDetail);
      setPage(nextPage);
      setAnswers(nextAnswers);
      setActiveStep(nextStep);
      setMarks({});
      setReveals({});
      quizRequest.current = undefined;
      setNotice("");
      setSaved("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    void api<unknown>("/ebook")
      .then((raw) => {
        if (!mounted) return;
        const next = normalizeCatalog(raw);
        setBook(next);
        const cursorId = next.cursor?.unit_id && next.units.some((unit) => unit.id === next.cursor?.unit_id) ? next.cursor.unit_id : next.units[0]?.id;
        if (cursorId) void openUnit(cursorId, next.cursor?.page, next);
      })
      .catch((e) => {
        if (mounted) setError((e as Error).message);
      });
    return () => {
      mounted = false;
    };
    // The learner identity is the only value that should reload the catalog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    if (!selected) return;
    const timer = window.setTimeout(() => void saveDraft().catch(() => undefined), 700);
    return () => window.clearTimeout(timer);
  }, [answers, activeStep, page, selected]);

  function updateProgress(next: EbookProgress) {
    setDetail((current) => current ? { ...current, progress: { ...current.progress, ...next } } : current);
    setBook((current) => current ? { ...current, progress: { ...current.progress, [selected]: { ...(current.progress[selected] || {}), ...next } } } : current);
    if (next.current_step !== undefined) draft.current.currentStep = next.current_step;
    if (next.completed_steps) draft.current.completedSteps = { ...draft.current.completedSteps, ...next.completed_steps };
  }

  function moveToStep(index: number, completePrevious = false) {
    if (!detail) return;
    const bounded = Math.max(0, Math.min(4, index));
    const completed = { ...(detail.progress.completed_steps || {}) };
    const previousStep = PROGRESS_STEP_IDS[bounded - 1];
    if (completePrevious && (previousStep === "understand" || previousStep === "examples")) completed[previousStep] = true;
    const currentStep = bounded + 1;
    draft.current.currentStep = currentStep;
    draft.current.completedSteps = completed;
    updateProgress({ current_step: currentStep, active_step: detail.pack.concept_steps[bounded]?.id, completed_steps: completed });
    setActiveStep(bounded);
    setNotice("");
  }

  function answerQuestion(question: EbookQuestion, value: string) {
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    draft.current.answers = next;
    quizRequest.current = undefined;
    setSaved("Saving…");
    if (typeof window !== "undefined") localStorage.setItem(progressStorage(user.id, draft.current.version, selected), JSON.stringify({ answers: next, currentStep: draft.current.currentStep, completedSteps: draft.current.completedSteps }));
    setMarks((current) => {
      const copy = { ...current };
      delete copy[question.id];
      return copy;
    });
  }

  async function checkAnswers() {
    if (!detail || !selected) return;
    setBusy(true);
    setError("");
    try {
      await saveDraft();
      const payload = Object.fromEntries(detail.pack.questions
        .filter((question) => !question.example && Boolean(answers[question.id]?.trim()))
        .map((question) => {
          const answer = answers[question.id].trim();
          const option = question.options.find((candidate) => candidate.id === answer);
          return [question.id, option?.text || answer];
        }));
      const fingerprint = JSON.stringify(payload);
      const requestId = quizRequest.current?.fingerprint === fingerprint
        ? quizRequest.current.requestId
        : typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${selected}`;
      quizRequest.current = { fingerprint, requestId };
      const result = await post<{ marks?: QuizMark[]; progress?: EbookProgress }>(`/ebook/units/${selected}/check`, { request_id: requestId, answers: payload });
      if (result.marks) {
        const marks = result.marks;
        setMarks((current) => ({ ...current, ...Object.fromEntries(marks.map((mark) => [mark.id, mark])) }));
      }
      if (result.progress) updateProgress(result.progress);
      quizRequest.current = undefined;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revealAnswer(question: EbookQuestion) {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await post<Record<string, { answers: string[]; explanation_th: string }>>(`/ebook/units/${selected}/reveal`, { ids: [question.id] });
      setReveals((current) => ({ ...current, ...result }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function retryQuestion(question: EbookQuestion) {
    setMarks((current) => {
      const next = { ...current };
      delete next[question.id];
      return next;
    });
    const next = { ...answers };
    delete next[question.id];
    setAnswers(next);
    draft.current.answers = next;
    quizRequest.current = undefined;
  }

  async function saveWord(word: EbookWord) {
    if (!detail || !selected) return;
    const key = word.term.toLocaleLowerCase();
    setBusy(true);
    try {
      await post("/vocabulary", { term: word.term, meaning: word.meaning, example: word.example });
      updateProgress({ vocabulary_saved: { ...(detail.progress.vocabulary_saved || {}), [key]: true } });
      setNotice(`${word.term} saved to your collection`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function startSession(mode: "shadowing" | "speak" | "listening") {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await saveDraft();
      const requestId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${mode}`;
      const result = await post<{ id: string }>(`/ebook/units/${selected}/sessions`, { mode, request_id: requestId });
      resume(result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function changePage(next: number) {
    if (!book || !detail) return;
    const bounded = Math.max(1, Math.min(book.page_count, next));
    setPage(bounded);
    draft.current.page = bounded;
    setSaved("Saving…");
  }

  if (!book) return <><ErrorMessage message={error} /><Loading /></>;
  if (!book.units.length) return <><ErrorMessage message={error} /><div className="empty"><h2>Learn Ebook</h2><p>Your course units are not available yet.</p></div></>;

  const pack = detail?.pack;
  const currentStep = pack?.concept_steps[activeStep] || pack?.concept_steps[0];
  const legacy = Boolean(pack && isLegacyPack(pack));
  const progressState = detail ? deriveLearningState(detail.progress) : "unlearned";
  return (
    <>
      <div className="page-intro ebook-page-intro">
        <div><span className="eyebrow">READ · TRY · LISTEN · SPEAK</span><h1>Learn Ebook</h1><p>Build one useful English pattern in 8–12 minutes, then loop it into your own words.</p></div>
        <div className="ebook-intro-meta"><span><BookOpen size={16} />{book.units.length} units</span><span><Clock3 size={16} />8–12 min each</span><button type="button" className="button small" onClick={review}>Review due units</button></div>
      </div>
      <ErrorMessage message={error} />
      {notice && <div className="notice ebook-live-notice" role="status" aria-live="polite">{notice}</div>}
      <div className="ebook-course-layout">
        <UnitNavigator units={book.units} progress={book.progress} selected={selected} search={search} filter={filter} onSelect={(id) => void openUnit(id)} onSearch={setSearch} onFilter={setFilter} disabled={busy} />
        <main className="ebook-lesson-column">
          {!detail || !pack || !currentStep ? <div className="card ebook-lesson-card"><h2>Select a unit to begin</h2><p>Choose a unit from the course list and follow one step at a time.</p></div> : <>
            <div className="ebook-lesson-heading"><div><span className="eyebrow">UNIT {detail.unit.number}</span><h2 aria-label="Unit lesson title">{detail.unit.title}</h2><p>{detail.pack.goal}</p></div><span className={`ebook-state-badge ${progressState}`}>{progressState}</span></div>
            <LessonStepper steps={pack.concept_steps} activeIndex={activeStep} onSelect={(index) => moveToStep(index)} />
            <div className="ebook-step-meta"><span>Step {activeStep + 1} of 5 · about {activeStep === 2 ? 3 : 2} min</span><div className="ebook-progress-track" role="progressbar" aria-label="Lesson steps" aria-valuenow={activeStep + 1} aria-valuemin={0} aria-valuemax={5}><span style={{ width: `${((activeStep + 1) / 5) * 100}%` }} /></div><OriginalBookDialog book={pack.original_book} pageCount={book.page_count} /></div>
            {activeStep === 0 && <>
              <LessonConcept pack={pack} step={currentStep} onExplain={() => setNotice("ลองอ่าน goal และ pattern ออกเสียงหนึ่งรอบ แล้วเติมรายละเอียดของคุณเอง")} />
              <LessonExamples pack={pack} step={pack.concept_steps[1] || currentStep} user={user} preview />
            </>}
            {activeStep === 1 && <LessonExamples pack={pack} step={currentStep} user={user} />}
            {activeStep === 2 && <LessonQuiz questions={pack.questions} answers={answers} marks={marks} reveals={reveals} onAnswer={answerQuestion} onCheck={() => void checkAnswers()} onReveal={(question) => void revealAnswer(question)} onRetry={retryQuestion} disabled={busy} />}
            {activeStep === 3 && <LessonShadowing pack={pack} step={currentStep} user={user} onStart={() => void startSession("shadowing")} />}
            {activeStep === 4 && <LessonUseIt pack={pack} step={currentStep} onStart={() => void startSession("speak")} />}
            {legacy && <LegacyExerciseCard detail={detail} answers={answers} marks={marks} reveals={reveals} onAnswer={answerQuestion} onCheck={() => void checkAnswers()} onReveal={(question) => void revealAnswer(question)} disabled={busy} />}
            <div className="ebook-primary-actions" aria-label="Lesson actions"><button type="button" className="button" onClick={() => setNotice(pack.explanation)}><Lightbulb size={17} />Explain</button><button type="button" className="button" onClick={() => { if (activeStep >= 3) void startSession(activeStep === 3 ? "shadowing" : "speak"); else moveToStep(Math.max(2, activeStep)); }} disabled={busy}><ArrowRight size={17} />Practice</button><button type="button" className="button primary" onClick={() => moveToStep(activeStep === 4 ? 4 : activeStep + 1, true)} disabled={busy || activeStep >= 4}>Next <ArrowRight size={17} /></button></div>
            <div className="ebook-speak-handoff"><div><span className="eyebrow">READY TO USE IT?</span><strong>Turn today&apos;s pattern into your own speaking practice.</strong></div><button type="button" className="button charcoal" aria-label="Start speaking practice" onClick={() => void startSession("speak")} disabled={busy}>Start speaking practice <ArrowRight size={17} /></button></div>
            {legacy && <LegacyBookControls book={book} detail={detail} page={page} onPage={changePage} onListening={() => void startSession("listening")} onSpeaking={() => void startSession("speak")} disabled={busy} />}
          </>}
        </main>
        {detail && pack && <LessonCoach pack={pack} progress={detail.progress} user={user} onSaveWord={(word) => void saveWord(word)} />}
      </div>
    </>
  );
}

function LegacyExerciseCard({
  detail,
  answers,
  marks,
  reveals,
  onAnswer,
  onCheck,
  onReveal,
  disabled,
}: {
  detail: EbookDetail;
  answers: Record<string, string>;
  marks: Record<string, QuizMark>;
  reveals: Record<string, { answers: string[]; explanation_th: string }>;
  onAnswer: (question: EbookQuestion, value: string) => void;
  onCheck: () => void;
  onReveal: (question: EbookQuestion) => void;
  disabled: boolean;
}) {
  return <section className="card ebook-legacy-card" aria-labelledby="ebook-original-exercises-title"><div><span className="eyebrow">COMPATIBILITY VIEW</span><h2 id="ebook-original-exercises-title">Original exercises</h2><p>คำตอบร่างเดิมยังอ่านและแก้ไขต่อได้จากบทเรียนเก่า</p></div>{detail.pack.questions.map((question) => { const mark = marks[question.id]; const reveal = reveals[question.id]; return <div className="ebook-question" key={question.id}><label htmlFor={`legacy-q-${question.id}`}><strong>{question.id.replace(":", " · ")}</strong><p>{question.prompt}</p><small>{question.instruction_th}</small></label>{question.kind === "write" || !question.options.length ? <textarea id={`legacy-q-${question.id}`} aria-label={`คำตอบ ${question.id}`} rows={2} disabled={disabled} value={answers[question.id] || ""} onChange={(event) => onAnswer(question, event.target.value)} /> : <select id={`legacy-q-${question.id}`} aria-label={`คำตอบ ${question.id}`} disabled={disabled} value={answers[question.id] || ""} onChange={(event) => onAnswer(question, event.target.value)}><option value="">เลือกคำตอบ / จับคู่</option>{question.options.map((option) => <option key={option.id} value={option.id}>{option.id}. {option.text}</option>)}</select>}{mark && <div className="notice" role="status">{mark.correct ? "✓ ถูกต้อง" : "ลองปรับอีกนิด"} · {mark.reason_th}{!mark.correct && <p>{mark.answer}</p>}</div>}{!question.example && <button type="button" className="text-button" disabled={disabled} onClick={() => onReveal(question)}>ขอดูเฉลยข้อนี้</button>}{reveal && <p className="notice">{reveal.answers.join(" / ")} — {reveal.explanation_th}</p>}</div>; })}<button type="button" className="button primary" disabled={disabled || !detail.pack.questions.some((question) => !question.example && answers[question.id]?.trim())} onClick={onCheck}>ตรวจคำตอบชุดนี้</button></section>;
}

function LegacyBookControls({
  book,
  detail,
  page,
  onPage,
  onListening,
  onSpeaking,
  disabled,
}: {
  book: EbookCatalog;
  detail: EbookDetail;
  page: number;
  onPage: (page: number) => void;
  onListening: () => void;
  onSpeaking: () => void;
  disabled: boolean;
}) {
  return <section className="card ebook-legacy-book"><h2>Original book</h2><div className="button-row"><button type="button" className="button" onClick={() => onPage(detail.unit.lesson_page)}>Lesson page</button><button type="button" className="button" onClick={() => onPage(detail.unit.exercise_page)}>Exercise page</button><span>Page {page} / {book.page_count}</span></div><div className="ebook-page-nav"><button type="button" className="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><a href={`/api/ebook/pages/${page}`} target="_blank" rel="noreferrer" title="Open original page"><img className="ebook-page" src={`/api/ebook/pages/${page}`} alt={`หนังสือต้นฉบับ หน้า ${page}`} loading="lazy" /></a><button type="button" className="button" disabled={page >= book.page_count} onClick={() => onPage(page + 1)}>Next</button></div><small>แตะภาพเพื่อขยาย · เปิดหน้าหนังสือเพิ่มเติมได้จากเลขหน้า</small><div className="button-row"><button type="button" className="button primary" disabled={disabled} onClick={onListening}>ฝึกฟังท้ายบท {detail.progress.listening_completed ? "✓" : ""}</button><button type="button" className="button charcoal" disabled={disabled} onClick={onSpeaking}>ฝึกพูดท้ายบท {detail.progress.speaking_completed ? "✓" : ""}</button></div></section>;
}
