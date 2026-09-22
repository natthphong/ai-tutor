import { Check, ChevronRight, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { EbookQuestion, QuizMark } from "./EbookTypes";

export default function LessonQuiz({
  questions,
  answers,
  marks,
  reveals,
  onAnswer,
  onCheck,
  onReveal,
  onRetry,
  disabled = false,
}: {
  questions: EbookQuestion[];
  answers: Record<string, string>;
  marks: Record<string, QuizMark>;
  reveals: Record<string, { answers: string[]; explanation_th: string }>;
  onAnswer: (question: EbookQuestion, value: string) => void;
  onCheck: () => void;
  onReveal: (question: EbookQuestion) => void;
  onRetry: (question: EbookQuestion) => void;
  disabled?: boolean;
}) {
  const playable = questions.filter((item) => !item.example);
  const [questionIndex, setQuestionIndex] = useState(() => Math.max(0, playable.findIndex((item) => item.options.length > 0)));
  useEffect(() => {
    setQuestionIndex(Math.max(0, playable.findIndex((item) => item.options.length > 0)));
  }, [questions]);
  const question = playable[questionIndex] || questions[0];
  if (!question) {
    return (
      <section className="ebook-lesson-card ebook-quiz-card" aria-labelledby="ebook-quiz-title">
        <span className="eyebrow">QUICK PRACTICE</span>
        <h2 id="ebook-quiz-title">Quick practice</h2>
        <p>แบบฝึกจะปรากฏเมื่อบทนี้มีคำถามพร้อมให้ลอง</p>
      </section>
    );
  }
  const mark = marks[question.id];
  const reveal = reveals[question.id];
  const value = answers[question.id] || "";
  return (
    <section className="ebook-lesson-card ebook-quiz-card" aria-labelledby="ebook-quiz-title">
      <div className="ebook-card-kicker"><span className="ebook-quiz-icon">?</span> Quick practice</div>
      <div className="ebook-quiz-heading"><div><span className="eyebrow">ONE QUESTION AT A TIME</span><h2 id="ebook-quiz-title">{question.prompt}</h2></div><span className="pill neutral">{questionIndex + 1} / {Math.max(1, playable.length)}</span></div>
      <p className="ebook-question-instruction">{question.instruction_th}</p>
      {question.kind === "write" || !question.options.length ? (
        <textarea
          aria-label={`Answer ${question.id}`}
          value={value}
          maxLength={2000}
          rows={3}
          disabled={disabled}
          onChange={(event) => onAnswer(question, event.target.value)}
          placeholder="พิมพ์คำตอบสั้น ๆ"
        />
      ) : (
        <fieldset className="ebook-options">
          <legend className="sr-only">Choose an answer</legend>
          {question.options.map((option) => (
            <label className={`ebook-option ${value === option.id ? "selected" : ""}`} key={option.id}>
              <input
                type="radio"
                name={`ebook-question-${question.id}`}
                value={option.id}
                checked={value === option.id}
                disabled={disabled}
                onChange={() => onAnswer(question, option.id)}
                aria-label={option.text}
              />
              <span><strong>{option.id}</strong>{option.text}</span>
            </label>
          ))}
        </fieldset>
      )}
      {mark && (
        <div className={`ebook-quiz-feedback ${mark.correct ? "correct" : "incorrect"}`} role="status" aria-label="Quiz feedback" aria-live="polite">
          {mark.correct ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}
          <span><strong>{mark.correct ? "Correct" : "Try again"}</strong> · {mark.reason_th}</span>
          {!mark.correct && <button type="button" className="text-button" onClick={() => onRetry(question)}><RotateCcw size={15} />Retry</button>}
        </div>
      )}
      {reveal && <p className="notice ebook-reveal-result">{reveal.answers.join(" / ")} — {reveal.explanation_th}</p>}
      <div className="ebook-quiz-actions">
        <button type="button" className="button primary" disabled={disabled || !value.trim()} onClick={onCheck}>ตรวจคำตอบชุดนี้</button>
        {questionIndex < playable.length - 1 && <button type="button" className="button" disabled={disabled || !mark?.correct} onClick={() => setQuestionIndex((index) => index + 1)}>Next question <ChevronRight size={16} /></button>}
        <button type="button" className="text-button" disabled={disabled} onClick={() => onReveal(question)}>ขอดูเฉลยข้อนี้</button>
      </div>
    </section>
  );
}
