import { Check, EarOff, Headphones, Mic, Volume2, X } from "lucide-react";
import type { User } from "@/lib/types";
import { VoiceButton } from "../ui";
import type { EbookListeningItem, EbookPack, EbookProgress, EbookStep, QuizMark } from "./EbookTypes";
import { isListeningDone } from "./EbookTypes";

export default function LessonShadowing({
  pack,
  step,
  user,
  progress = {},
  answers = {},
  marks = {},
  onAnswer,
  onCheck,
  onStart,
  disabled = false,
}: {
  pack: EbookPack;
  step: EbookStep;
  user: User;
  progress?: EbookProgress;
  answers?: Record<string, string>;
  marks?: Record<string, QuizMark>;
  onAnswer?: (item: EbookListeningItem, optionId: string) => void;
  onCheck?: (item: EbookListeningItem) => void;
  onStart: () => void;
  disabled?: boolean;
}) {
  const listenFirst = pack.listening_items.length > 0;
  const scores = progress.listening_scores || {};
  const listened = !listenFirst || isListeningDone(pack, progress);
  return (
    <section className="ebook-lesson-card ebook-shadowing-card" aria-labelledby="ebook-shadowing-title">
      <div className="ebook-card-kicker"><Headphones size={16} aria-hidden="true" /> Listen and shadow</div>
      <h2 id="ebook-shadowing-title">{step.title}</h2>
      {listenFirst ? (
        <>
          <p>ฟังก่อนโดยยังไม่เห็นข้อความ ตอบคำถามจากสิ่งที่ได้ยิน เมื่อตอบถูกครบ 3 ประโยคจึงเปิดข้อความให้พูดตาม</p>
          <div className="ebook-listening-list" aria-label="Listening questions">
            {pack.listening_items.map((item, index) => {
              const mark = marks[item.id];
              const passed = scores[item.id] === true || mark?.correct === true;
              const line = pack.shadowing_sentences[index];
              const value = answers[item.id] || "";
              return (
                <article className={`ebook-listening-item ${passed ? "passed" : ""}`} key={item.id} data-testid="ebook-listening-item">
                  <div className="ebook-listening-head">
                    <span className="ebook-line-number">Listen {index + 1}</span>
                    {passed ? <span className="pill green"><Check size={13} aria-hidden="true" /> เข้าใจแล้ว</span> : <span className="pill neutral"><EarOff size={13} aria-hidden="true" /> ซ่อนข้อความ</span>}
                  </div>
                  <VoiceButton text={item.sentence} voice={user.profile.voice} speed={user.profile.speed} label={`Play line ${index + 1}`} />
                  <p className="ebook-listening-question">{item.question_th}</p>
                  <fieldset className="ebook-options" disabled={disabled || passed}>
                    <legend className="sr-only">{item.question_th}</legend>
                    {item.options.map((option) => (
                      <label className={`ebook-option ${value === option.id ? "selected" : ""}`} key={option.id}>
                        <input type="radio" name={`ebook-listening-${item.id}`} value={option.id} checked={value === option.id} onChange={() => onAnswer?.(item, option.id)} aria-label={option.text} />
                        <span>{option.text}</span>
                      </label>
                    ))}
                  </fieldset>
                  {passed ? (
                    <div className="ebook-listening-reveal" role="status">
                      <strong>{line?.sentence || item.sentence}</strong>
                      {line?.meaning && <span>{line.meaning}</span>}
                    </div>
                  ) : (
                    <>
                      {mark && !mark.correct && <div className="ebook-quiz-feedback incorrect" role="status" aria-live="polite"><X size={18} aria-hidden="true" /><span><strong>Try again</strong> · {mark.reason_th}</span></div>}
                      <button type="button" className="button small" disabled={disabled || !value} onClick={() => onCheck?.(item)}>ตรวจข้อนี้</button>
                    </>
                  )}
                </article>
              );
            })}
          </div>
          {listened && <div className="ebook-shadowing-note"><Mic size={17} aria-hidden="true" /><span>ฟังครบแล้ว ต่อไปพูดตามทั้ง 3 ประโยคด้วยเสียงของคุณ ระบบนับเฉพาะเสียงที่อัดชัดเจน</span></div>}
        </>
      ) : (
        <>
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
        </>
      )}
      <button type="button" className="button primary" onClick={onStart} disabled={disabled || !pack.shadowing_sentences.length || !listened}>{listened ? <Mic size={18} /> : <Volume2 size={18} />}{listened ? "Start shadowing practice" : "ฟังให้ครบ 3 ประโยคก่อน"}</button>
    </section>
  );
}
