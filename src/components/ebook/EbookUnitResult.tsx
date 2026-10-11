"use client";

import { ArrowRight, Check, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { COURSE_STEPS, STEP_TASK_TH, normalizeDetail, openSteps, type EbookProgress } from "./EbookTypes";

/**
 * Shown when a Learn Ebook practice session ends. It reads the unit again from
 * the server and says whether the unit is now 100% or which steps are still
 * open, so finishing a session never leaves the learner guessing.
 */
export default function EbookUnitResult({ unitId, onBack }: { unitId: string; onBack: () => void }) {
  const [progress, setProgress] = useState<EbookProgress | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    api<unknown>(`/ebook/units/${unitId}`, { cache: "no-store" })
      .then((raw) => {
        if (!active) return;
        const detail = normalizeDetail(raw);
        if (detail) setProgress(detail.progress);
        else setFailed(true);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [unitId]);
  if (failed) return <button type="button" className="button primary" onClick={onBack}>กลับไปที่บทเรียน <ArrowRight size={18} /></button>;
  if (!progress) return <p className="fine-print" role="status">กำลังตรวจสถานะของบท…</p>;
  const open = openSteps(progress);
  const done = COURSE_STEPS.length - open.length;
  return (
    <div className={`ebook-unit-result ${open.length ? "open" : "done"}`} data-testid="ebook-unit-result" role="status">
      <div className="ebook-unit-result-head">
        <strong className="ebook-unit-result-percent">{done * 20}%</strong>
        <div><h3>{open.length ? `บทนี้ยังเหลืออีก ${open.length} ขั้น` : "บทนี้ครบ 100% แล้ว"}</h3><p>{open.length ? "ทำขั้นที่เหลือให้ครบ บทจึงจะนับว่าเรียนจบและเข้าคิวทบทวน" : "บันทึกแล้ว ระบบนัดทบทวนให้ในอีก 1 และ 3 วัน"}</p></div>
      </div>
      <ul className="ebook-unit-result-steps">
        {COURSE_STEPS.map((step) => {
          const stepOpen = open.includes(step.id);
          return <li key={step.id} className={stepOpen ? "open" : "done"} data-step={step.id}>{stepOpen ? <Circle size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}<span><strong>{step.title}</strong>{stepOpen && <small>{STEP_TASK_TH[step.id]}</small>}</span></li>;
        })}
      </ul>
      <button type="button" className="button primary" onClick={onBack}>{open.length ? "กลับไปทำขั้นที่เหลือ" : "กลับไปที่บทเรียน"} <ArrowRight size={18} /></button>
    </div>
  );
}
