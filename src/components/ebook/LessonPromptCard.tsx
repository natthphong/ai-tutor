"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import type { EbookPack, EbookUnit } from "./EbookTypes";
import { buildUnitPrompt, copyText } from "./unitPrompt";

/** Lets the learner take this unit to a voice AI outside the app. */
export default function LessonPromptCard({ unit, pack }: { unit: EbookUnit; pack: EbookPack }) {
  const prompt = useMemo(() => buildUnitPrompt(unit, pack), [unit, pack]);
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    setState((await copyText(prompt)) ? "copied" : "failed");
  }
  return (
    <section className="ebook-prompt-card" aria-labelledby="ebook-prompt-title">
      <div>
        <span className="eyebrow"><ExternalLink size={14} aria-hidden="true" /> PRACTISE OUTSIDE THE APP</span>
        <h3 id="ebook-prompt-title">ฝึกพูดบทนี้ต่อกับ AI นอกแอป</h3>
        <p>คัดลอก prompt ของบทนี้ไปวางใน ChatGPT, Gemini หรือ Claude แล้วเปิดโหมดเสียง AI จะถามทีละคำถามด้วย grammar และคำศัพท์ของบทนี้ และสรุปจุดที่ควรแก้เป็นภาษาไทย การฝึกนอกแอปไม่ถูกนับเป็นความคืบหน้าในแอป</p>
      </div>
      <div className="ebook-prompt-actions">
        <button type="button" className="button primary" onClick={() => void copy()}>{state === "copied" ? <Check size={17} /> : <Copy size={17} />}{state === "copied" ? "คัดลอกแล้ว" : "Copy prompt"}</button>
        <span role="status" aria-live="polite">{state === "copied" ? "วาง prompt ในแชต AI แล้วกดปุ่มไมค์ได้เลย" : state === "failed" ? "คัดลอกอัตโนมัติไม่ได้ เปิดดู prompt ด้านล่างแล้วคัดลอกเอง" : ""}</span>
      </div>
      <details open={state === "failed" || undefined}>
        <summary>ดู prompt</summary>
        <pre className="ebook-prompt-text" data-testid="ebook-unit-prompt">{prompt}</pre>
      </details>
    </section>
  );
}
