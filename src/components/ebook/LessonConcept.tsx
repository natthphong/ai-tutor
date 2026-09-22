import { Lightbulb, Sparkles } from "lucide-react";
import type { EbookPack, EbookStep } from "./EbookTypes";

export default function LessonConcept({
  pack,
  step,
  onExplain,
}: {
  pack: EbookPack;
  step: EbookStep;
  onExplain?: () => void;
}) {
  return (
    <section className="ebook-lesson-card ebook-concept-card" aria-labelledby="ebook-lesson-title">
      <div className="ebook-card-kicker"><Sparkles size={16} aria-hidden="true" /> Understand the idea</div>
      <h2 id="ebook-lesson-title">{step.title}</h2>
      <div className="ebook-goal-box">
        <span className="eyebrow">TODAY&apos;S GOAL</span>
        <p>{pack.goal}</p>
      </div>
      <p className="ebook-explanation">{pack.explanation}</p>
      <div className="ebook-pattern-box">
        <span className="eyebrow">REUSABLE PATTERN</span>
        <strong>{pack.pattern}</strong>
      </div>
      {pack.notes.length > 0 && (
        <ul className="ebook-notes">
          {pack.notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      )}
      <div className="ebook-tip"><Lightbulb size={18} aria-hidden="true" /><span>เริ่มจากความหมาย แล้วเติมรายละเอียดของคุณเอง</span></div>
      {onExplain && <button type="button" className="button small" onClick={onExplain}>Explain this pattern</button>}
    </section>
  );
}
