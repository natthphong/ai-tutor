import { ArrowRight, MessageCircle } from "lucide-react";
import type { EbookPack, EbookStep } from "./EbookTypes";

export default function LessonUseIt({
  pack,
  step,
  onStart,
}: {
  pack: EbookPack;
  step: EbookStep;
  onStart: () => void;
}) {
  return (
    <section className="ebook-lesson-card ebook-use-card" aria-labelledby="ebook-use-title">
      <div className="ebook-card-kicker"><MessageCircle size={16} aria-hidden="true" /> Make it yours</div>
      <h2 id="ebook-use-title">{step.title}</h2>
      <div className="ebook-speaking-prompt"><span className="eyebrow">LOOP COACH ASKS</span><strong>{pack.speaking_prompt}</strong>{pack.speaking_th && <p>{pack.speaking_th}</p>}</div>
      <p>พูดสองรอบด้วยรายละเอียดของคุณเอง รอบที่สองจะเปลี่ยนบริบทให้คุณนำ pattern ไปใช้จริง</p>
      <button type="button" className="button primary" onClick={onStart}><ArrowRight size={18} />Start speaking practice</button>
    </section>
  );
}
