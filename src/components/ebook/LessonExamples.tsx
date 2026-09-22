import { Volume2 } from "lucide-react";
import type { User } from "@/lib/types";
import { VoiceButton } from "../ui";
import type { EbookExample, EbookPack, EbookStep } from "./EbookTypes";

export default function LessonExamples({
  pack,
  step,
  user,
  preview = false,
}: {
  pack: EbookPack;
  step: EbookStep;
  user: User;
  preview?: boolean;
}) {
  return (
    <section className={`ebook-lesson-card ${preview ? "ebook-example-preview" : ""}`} aria-labelledby="ebook-examples-title">
      <div className="ebook-card-kicker"><Volume2 size={16} aria-hidden="true" /> Listen to useful examples</div>
      <h2 id="ebook-examples-title">{preview ? "See it in context" : step.title}</h2>
      <p>{preview ? "สามตัวอย่างจากบทนี้ช่วยให้เห็น pattern ก่อนลองทำแบบฝึก" : "สามประโยคสั้น ๆ ที่คุณนำไปใช้ได้ทันที"}</p>
      <div className="ebook-example-list">
        {pack.examples.slice(0, 3).map((example: EbookExample, index) => (
          <article className="ebook-example" key={`${example.sentence}-${index}`}>
            <span className="ebook-example-number">{index + 1}</span>
            <div>
              <strong>{example.sentence}</strong>
              <p>{example.meaning || "ลองฟัง แล้วจับความหมายที่ต้องการสื่อ"}</p>
              {example.audio_id ? (
                <audio controls preload="none" src={`/api/audio/${example.audio_id}`} aria-label={`Play example ${index + 1}`} />
              ) : (
                <VoiceButton text={example.sentence} voice={user.profile.voice} speed={user.profile.speed} label="Play example" />
              )}
            </div>
          </article>
        ))}
        {!pack.examples.length && <p className="ebook-empty">Examples will appear here when this lesson is ready.</p>}
      </div>
    </section>
  );
}
