import { ArrowRight, MessageCircle } from "lucide-react";
import type { EbookPack, EbookProgress, EbookStep } from "./EbookTypes";
import { isStepDone } from "./EbookTypes";

export default function LessonUseIt({
  pack,
  step,
  progress = {},
  onStart,
  disabled = false,
}: {
  pack: EbookPack;
  step: EbookStep;
  progress?: EbookProgress;
  onStart: () => void;
  disabled?: boolean;
}) {
  const done = isStepDone(progress, "speaking");
  return (
    <section className="ebook-lesson-card ebook-use-card" aria-labelledby="ebook-use-title">
      <div className="ebook-card-kicker"><MessageCircle size={16} aria-hidden="true" /> Make it yours</div>
      <h2 id="ebook-use-title">{step.title}</h2>
      <div className="ebook-speaking-prompt"><span className="eyebrow">LOOP COACH ASKS</span><strong>{pack.speaking_prompt}</strong>{pack.speaking_th && <p>{pack.speaking_th}</p>}</div>
      <p>พูดด้วยรายละเอียดของคุณเอง ขั้นนี้ผ่านเมื่อพูดถูกและชัดครบ 2 ครั้ง โดยไม่ใช้ตัวช่วย รอบที่สองจะเปลี่ยนบริบทให้คุณนำ pattern ไปใช้จริง</p>
      {pack.speaking_criteria.length > 0 && (
        <ul className="ebook-notes" aria-label="Speaking success criteria">
          {pack.speaking_criteria.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
      <button type="button" className="button primary" onClick={onStart} disabled={disabled}><ArrowRight size={18} />{done ? "ฝึกพูดอีกรอบ" : "Start speaking practice"}</button>
    </section>
  );
}
