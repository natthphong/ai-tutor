import { Check, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { EbookQuestion, QuizMark } from "./EbookTypes";

const KIND_LABEL: Record<EbookQuestion["kind"], string> = {
  choice: "เลือกคำตอบ",
  fill: "เติมคำในช่องว่าง",
  reorder: "เรียงคำให้เป็นประโยค",
  fix: "แก้ประโยคให้ถูก",
  translate: "แปลเป็นภาษาอังกฤษ",
  write: "เขียนประโยคของคุณเอง",
  match: "จับคู่",
};

function firstOpenQuestion(questions: EbookQuestion[], scores: Record<string, number | boolean>): number {
  // A unit with recorded results resumes at the first question that is not
  // correct yet. Before any attempt, start with a selectable question.
  if (questions.some((item) => scores[item.id] !== undefined)) {
    const open = questions.findIndex((item) => scores[item.id] !== true);
    return open >= 0 ? open : 0;
  }
  return Math.max(0, questions.findIndex((item) => item.options.length > 0));
}

function ReorderInput({
  question,
  value,
  disabled,
  onChange,
}: {
  question: EbookQuestion;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const tokens = question.tokens || [];
  const [picked, setPicked] = useState<number[]>([]);
  useEffect(() => {
    // Retry clears the answer; the word bank must follow it.
    if (!value) setPicked([]);
  }, [value, question.id]);
  function update(next: number[]) {
    setPicked(next);
    onChange(next.map((index) => tokens[index]).join(" "));
  }
  return (
    <div className="ebook-reorder">
      <div className="ebook-reorder-answer" aria-label="Your sentence" aria-live="polite">
        {picked.length === 0 && <span className="ebook-reorder-placeholder">แตะคำด้านล่างตามลำดับ</span>}
        {picked.map((index, position) => (
          <button type="button" className="ebook-token picked" key={`${index}-${position}`} disabled={disabled} aria-label={`Remove ${tokens[index]}`} onClick={() => update(picked.filter((_, at) => at !== position))}>{tokens[index]}</button>
        ))}
      </div>
      <div className="ebook-reorder-bank" aria-label="Word bank">
        {tokens.map((token, index) => (
          <button type="button" className="ebook-token" key={`${token}-${index}`} disabled={disabled || picked.includes(index)} onClick={() => update([...picked, index])}>{token}</button>
        ))}
      </div>
    </div>
  );
}

export default function LessonQuiz({
  questions,
  answers,
  marks,
  reveals,
  scores = {},
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
  scores?: Record<string, number | boolean>;
  onAnswer: (question: EbookQuestion, value: string) => void;
  onCheck: (question: EbookQuestion) => void;
  onReveal: (question: EbookQuestion) => void;
  onRetry: (question: EbookQuestion) => void;
  disabled?: boolean;
}) {
  const playable = questions.filter((item) => !item.example);
  const [questionIndex, setQuestionIndex] = useState(() => firstOpenQuestion(playable, scores));
  useEffect(() => {
    setQuestionIndex(firstOpenQuestion(playable, scores));
    // Only a different lesson resets the position; marks must not move it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const passed = mark?.correct === true || scores[question.id] === true;
  const correctCount = playable.filter((item) => marks[item.id]?.correct === true || scores[item.id] === true).length;
  const allPassed = playable.length > 1 && correctCount === playable.length;
  const selectable = question.kind === "choice" || question.kind === "match";
  return (
    <section className="ebook-lesson-card ebook-quiz-card" aria-labelledby="ebook-quiz-title">
      <div className="ebook-card-kicker"><span className="ebook-quiz-icon">?</span> Quick practice</div>
      <div className="ebook-quiz-heading"><div><span className="eyebrow">ONE QUESTION AT A TIME · {KIND_LABEL[question.kind] || "ตอบคำถาม"}</span><h2 id="ebook-quiz-title">{question.prompt}</h2></div><span className="pill neutral">{questionIndex + 1} / {Math.max(1, playable.length)}</span></div>
      {playable.length > 1 && (
        <ol className="ebook-quiz-dots" aria-label={`Correct ${correctCount} of ${playable.length}`}>
          {playable.map((item, index) => {
            const done = marks[item.id]?.correct === true || scores[item.id] === true;
            return <li key={item.id}><button type="button" className={`${done ? "done" : ""} ${index === questionIndex ? "current" : ""}`} aria-label={`Question ${index + 1}${done ? " correct" : ""}`} aria-current={index === questionIndex ? "step" : undefined} disabled={disabled} onClick={() => setQuestionIndex(index)}>{done ? <Check size={12} aria-hidden="true" /> : index + 1}</button></li>;
          })}
        </ol>
      )}
      <p className="ebook-question-instruction">{question.instruction_th}</p>
      {question.kind === "reorder" && (question.tokens?.length || 0) > 0 ? (
        <ReorderInput question={question} value={value} disabled={disabled} onChange={(next) => onAnswer(question, next)} />
      ) : selectable && question.options.length > 0 ? (
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
      ) : question.kind === "fill" ? (
        <input
          className="ebook-fill-input"
          aria-label={`Answer ${question.id}`}
          value={value}
          maxLength={200}
          disabled={disabled}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => onAnswer(question, event.target.value)}
          placeholder="พิมพ์คำที่หายไป"
        />
      ) : (
        <>
          <textarea
            aria-label={`Answer ${question.id}`}
            value={value}
            maxLength={2000}
            rows={3}
            disabled={disabled}
            onChange={(event) => onAnswer(question, event.target.value)}
            placeholder={question.kind === "fix" ? "พิมพ์ประโยคที่แก้แล้วทั้งประโยค" : "พิมพ์คำตอบสั้น ๆ"}
          />
          {question.kind === "fix" && !value && <button type="button" className="text-button" disabled={disabled} onClick={() => onAnswer(question, question.prompt)}>คัดลอกประโยคมาแก้</button>}
        </>
      )}
      {mark && (
        <div className={`ebook-quiz-feedback ${mark.correct ? "correct" : "incorrect"}`} role="status" aria-label="Quiz feedback" aria-live="polite">
          {mark.correct ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}
          <span><strong>{mark.correct ? "Correct" : "Try again"}</strong> · {mark.reason_th}{!mark.correct && mark.answer && question.kind !== "choice" && question.kind !== "match" ? <em className="ebook-quiz-model"> ตัวอย่างที่ถูก: {mark.answer}</em> : null}</span>
          {!mark.correct && <button type="button" className="text-button" onClick={() => onRetry(question)}><RotateCcw size={15} />Retry</button>}
        </div>
      )}
      {reveal && <p className="notice ebook-reveal-result">{reveal.answers.join(" / ")} — {reveal.explanation_th}</p>}
      {allPassed && <p className="notice ebook-quiz-complete" role="status">ผ่านแบบฝึกครบ {playable.length} ข้อแล้ว ไปขั้นฟังต่อได้เลย</p>}
      <div className="ebook-quiz-actions">
        <button type="button" className="button primary" disabled={disabled || !value.trim()} onClick={() => onCheck(question)}>ตรวจคำตอบ</button>
        {questionIndex > 0 && <button type="button" className="button" disabled={disabled} onClick={() => setQuestionIndex((index) => index - 1)}><ChevronLeft size={16} /> Back</button>}
        {questionIndex < playable.length - 1 && <button type="button" className="button" disabled={disabled || !passed} onClick={() => setQuestionIndex((index) => index + 1)}>Next question <ChevronRight size={16} /></button>}
        <button type="button" className="text-button" disabled={disabled} onClick={() => onReveal(question)}>ขอดูเฉลยข้อนี้</button>
      </div>
    </section>
  );
}
