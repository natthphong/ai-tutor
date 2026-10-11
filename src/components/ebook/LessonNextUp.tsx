import { ArrowRight, Check, PartyPopper } from "lucide-react";
import type { CourseStepId, EbookProgress } from "./EbookTypes";
import { COURSE_STEPS, STEP_TASK_TH, openSteps } from "./EbookTypes";

/**
 * Says what is still open in the unit and offers the one next action. A unit
 * reaches 100% only when all five steps are recorded, so this strip is where
 * the learner sees why a unit is not finished yet.
 */
export default function LessonNextUp({
  progress,
  listened,
  activeStep,
  hasNextUnit,
  onStep,
  onShadow,
  onSpeak,
  onNextUnit,
  disabled = false,
}: {
  progress: EbookProgress;
  listened: boolean;
  activeStep: number;
  hasNextUnit: boolean;
  onStep: (index: number) => void;
  onShadow: () => void;
  onSpeak: () => void;
  onNextUnit: () => void;
  disabled?: boolean;
}) {
  const open = openSteps(progress);
  if (!open.length) {
    return (
      <div className="ebook-next-up done" data-testid="ebook-next-up" role="status">
        <div><span className="eyebrow"><PartyPopper size={14} aria-hidden="true" /> UNIT COMPLETE</span><strong>บทนี้ครบ 100% แล้ว</strong><p>ทุกขั้นถูกบันทึกแล้ว ระบบนัดทบทวนให้ในอีก 1 และ 3 วัน</p></div>
        {hasNextUnit && <button type="button" className="button charcoal" onClick={onNextUnit} disabled={disabled}>ไปบทถัดไป <ArrowRight size={17} /></button>}
      </div>
    );
  }
  const next = open[0];
  const index = COURSE_STEPS.findIndex((step) => step.id === next);
  const action: Record<CourseStepId, { label: string; run: () => void }> = {
    understand: { label: "ไปขั้นถัดไป", run: () => onStep(Math.max(index + 1, activeStep + 1)) },
    examples: { label: "ไปขั้นถัดไป", run: () => onStep(Math.max(index + 1, activeStep + 1)) },
    quiz: { label: "ไปทำแบบฝึก", run: () => onStep(2) },
    shadowing: listened ? { label: "เริ่มพูดตาม 3 ประโยค", run: onShadow } : { label: "ไปฟังแล้วตอบ", run: () => onStep(3) },
    speaking: { label: "Start speaking practice", run: onSpeak },
  };
  return (
    <div className="ebook-next-up" data-testid="ebook-next-up">
      <div>
        <span className="eyebrow">เหลืออีก {open.length} ขั้น จึงครบ 100%</span>
        <ul className="ebook-open-steps" aria-label="Steps still open">
          {COURSE_STEPS.map((step) => {
            const done = !open.includes(step.id);
            return <li key={step.id} className={done ? "done" : "open"} data-step={step.id}>{done && <Check size={13} aria-hidden="true" />}<span>{step.title}</span>{!done && <small>{STEP_TASK_TH[step.id]}</small>}</li>;
          })}
        </ul>
      </div>
      <button type="button" className="button charcoal" onClick={action[next].run} disabled={disabled}>{action[next].label} <ArrowRight size={17} /></button>
    </div>
  );
}
