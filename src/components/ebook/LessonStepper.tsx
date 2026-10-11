"use client";

import { Check, CircleAlert, Lock } from "lucide-react";
import { useEffect, useRef } from "react";
import type { EbookProgress, EbookStep } from "./EbookTypes";
import { COURSE_STEPS, isStepDone } from "./EbookTypes";

/**
 * The five steps of a unit. A check mark means the server recorded the step as
 * finished, never just that the learner moved past it: a step that was passed
 * over while still open is flagged so the unit cannot look complete at 80%.
 */
export default function LessonStepper({
  steps,
  activeIndex,
  progress,
  onSelect,
}: {
  steps: EbookStep[];
  activeIndex: number;
  progress: EbookProgress;
  onSelect: (index: number) => void;
}) {
  // On a narrow screen the steps scroll sideways; keep the current one in view.
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const current = list.current?.querySelector<HTMLElement>('[aria-current="step"]');
    const scroller = list.current?.parentElement;
    if (!current || !scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    scroller.scrollTo({ left: current.offsetLeft - (scroller.clientWidth - current.offsetWidth) / 2, behavior: "smooth" });
  }, [activeIndex]);
  return (
    <nav className="ebook-stepper" aria-label="Concept steps">
      <ol ref={list}>
        {steps.slice(0, 5).map((step, index) => {
          const current = index === activeIndex;
          const completed = isStepDone(progress, COURSE_STEPS[index].id);
          const skipped = !completed && index < activeIndex;
          const locked = step.status === "locked" && index > activeIndex;
          const state = completed ? "Done" : current ? "Now" : skipped ? "ยังไม่ครบ" : "Next";
          return (
            <li
              key={`${step.id}-${index}`}
              aria-label={`${step.title} · ${state}`}
              aria-current={current ? "step" : undefined}
              className={`${current ? "active" : ""} ${completed ? "complete" : ""} ${skipped ? "skipped" : ""} ${locked ? "locked" : ""}`}
              data-step-state={completed ? "done" : skipped ? "skipped" : current ? "current" : "next"}
            >
              <button type="button" aria-label={step.title} onClick={() => onSelect(index)} disabled={locked}>
                <span className="ebook-step-number">
                  {completed ? <Check size={15} aria-hidden="true" /> : skipped ? <CircleAlert size={15} aria-hidden="true" /> : locked ? <Lock size={13} aria-hidden="true" /> : index + 1}
                </span>
                <span className="ebook-step-copy">
                  <strong>{step.title}</strong>
                  <small>{state}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <span className="ebook-stepper-hint" aria-hidden="true">Swipe for more steps →</span>
    </nav>
  );
}
