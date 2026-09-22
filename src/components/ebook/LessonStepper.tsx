"use client";

import { Check, Lock } from "lucide-react";
import type { EbookStep } from "./EbookTypes";

export default function LessonStepper({
  steps,
  activeIndex,
  onSelect,
}: {
  steps: EbookStep[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav className="ebook-stepper" aria-label="Concept steps">
      <ol>
        {steps.slice(0, 5).map((step, index) => {
          const current = index === activeIndex;
          const completed = step.status === "complete" || index < activeIndex;
          const locked = step.status === "locked" && index > activeIndex;
          return (
            <li
              key={`${step.id}-${index}`}
              aria-label={step.title}
              aria-current={current ? "step" : undefined}
              className={`${current ? "active" : ""} ${completed ? "complete" : ""} ${locked ? "locked" : ""}`}
            >
              <button
                type="button"
                aria-label={step.title}
                onClick={() => onSelect(index)}
                disabled={locked}
              >
                <span className="ebook-step-number">
                  {completed ? <Check size={15} aria-hidden="true" /> : locked ? <Lock size={13} aria-hidden="true" /> : index + 1}
                </span>
                <span className="ebook-step-copy">
                  <strong>{step.title}</strong>
                  <small>{current ? "Now" : completed ? "Done" : "Next"}</small>
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
