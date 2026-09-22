import { Headphones, Mic, Volume2 } from "lucide-react";
import type { User } from "@/lib/types";
import { VoiceButton } from "../ui";
import type { EbookPack, EbookStep } from "./EbookTypes";

export default function LessonShadowing({
  pack,
  step,
  user,
  onStart,
}: {
  pack: EbookPack;
  step: EbookStep;
  user: User;
  onStart: () => void;
}) {
  return (
    <section className="ebook-lesson-card ebook-shadowing-card" aria-labelledby="ebook-shadowing-title">
      <div className="ebook-card-kicker"><Headphones size={16} aria-hidden="true" /> Listen and shadow</div>
      <h2 id="ebook-shadowing-title">{step.title}</h2>
      <p>ฟังประโยคจากบทนี้ แล้วพูดตามด้วยเสียงจริงของคุณ สามบรรทัดนี้มาจากตัวอย่างด้านข้างแบบคำต่อคำ</p>
      <div className="ebook-shadowing-lines">
        {pack.shadowing_sentences.slice(0, 3).map((line, index) => (
          <article className="ebook-shadowing-line" key={`${line.sentence}-${index}`}>
            <span className="ebook-line-number">Line {index + 1}</span>
            <strong>{line.sentence}</strong>
            {line.meaning && <span>{line.meaning}</span>}
            <small>Source: lesson example{line.source_page ? `, page ${line.source_page}` : ""}</small>
            {line.audio_id ? <audio controls preload="none" src={`/api/audio/${line.audio_id}`} aria-label={`Play shadowing line ${index + 1}`} /> : <VoiceButton text={line.sentence} voice={user.profile.voice} speed={user.profile.speed} label="Play line" />}
          </article>
        ))}
      </div>
      <div className="ebook-shadowing-note"><Mic size={17} aria-hidden="true" /><span>Typing can help you follow along, but only a clear recorded attempt completes a line.</span></div>
      <button type="button" className="button primary" onClick={onStart} disabled={!pack.shadowing_sentences.length}><Mic size={18} />Start shadowing practice</button>
    </section>
  );
}
