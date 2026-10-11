"use client";

import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LoaderCircle, Mic, RotateCcw, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { DailyDrillProgress, DailyEntry, DailySentence, DailySpeakResult, User } from "@/lib/types";
import { VoiceRecorder } from "@/features/audio/recorder";
import { useSwipeNav } from "@/features/gesture/useSwipeNav";
import { ErrorMessage, VoiceButton } from "./ui";

/** Support shown while speaking one sentence. Higher is harder. */
export type SupportLevel = 1 | 2 | 3;

export const SUPPORT_LEVELS: { level: SupportLevel; label: string; shows: string }[] = [
  { level: 1, label: "มีคำอ่าน", shows: "เห็นประโยค คำอ่าน และความหมาย" },
  { level: 2, label: "ไม่มีคำอ่าน", shows: "เห็นประโยคและความหมาย" },
  { level: 3, label: "ไม่เห็นประโยค", shows: "เห็นแค่ความหมายภาษาไทย พูดจากความจำ" },
];

export function passedLevel(drill: DailyDrillProgress | undefined, index: number): number {
  return drill?.levels?.[String(index)] ?? 0;
}

/** The next level worth practising: one above what every sentence has passed. */
export function suggestedLevel(drill: DailyDrillProgress | undefined, count: number): SupportLevel {
  let lowest = 3;
  for (let i = 0; i < count; i++) lowest = Math.min(lowest, passedLevel(drill, i));
  return Math.min(3, lowest + 1) as SupportLevel;
}

function firstOpenIndex(drill: DailyDrillProgress | undefined, count: number, level: SupportLevel): number {
  for (let i = 0; i < count; i++) if (passedLevel(drill, i) < level) return i;
  return -1;
}

/**
 * Speaking drill for one Daily Meet entry: one short sentence at a time with
 * support that fades (reading aid, then text only, then Thai meaning only),
 * and finally the whole entry told from memory.
 */
export default function DailyDrill({
  entry,
  user,
  onProgress,
  onOpenUnit,
  onExit,
}: {
  entry: DailyEntry;
  user: User;
  onProgress: (drill: DailyDrillProgress) => void;
  onOpenUnit: (unitId: string) => void;
  onExit: () => void;
}) {
  const sentences: DailySentence[] = entry.sentences || [];
  const count = sentences.length;
  const [drill, setDrill] = useState<DailyDrillProgress | undefined>(entry.drill);
  const [level, setLevel] = useState<SupportLevel>(() => suggestedLevel(entry.drill, count));
  const [index, setIndex] = useState(() => Math.max(0, firstOpenIndex(entry.drill, count, suggestedLevel(entry.drill, count))));
  const [whole, setWhole] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const [showOutline, setShowOutline] = useState(true);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DailySpeakResult>();
  const [mine, setMine] = useState("");
  const recorder = useRef(new VoiceRecorder());
  const card = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const request = useRef<{ key: string; id: string } | undefined>(undefined);

  useEffect(() => () => recorder.current.cancel(), []);
  useEffect(() => () => { if (mine) URL.revokeObjectURL(mine); }, [mine]);
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds(recorder.current.seconds), 200);
    return () => clearInterval(timer);
  }, [recording]);

  useSwipeNav(card, {
    canPrev: index > 0,
    canNext: index < count - 1,
    onPrev: () => goTo(index - 1),
    onNext: () => goTo(index + 1),
    disabled: whole || busy || recording,
  }, `${whole}-${level}-${index}-${Boolean(result)}`);
  // A result is a meaningful moment: a short tap for a pass, two for a miss.
  useEffect(() => {
    if (result && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(result.passed ? 12 : [8, 60, 8]);
  }, [result]);

  const sentence = sentences[index];
  const roundDone = !whole && firstOpenIndex(drill, count, level) < 0;
  const passedHere = sentences.filter((_, i) => passedLevel(drill, i) >= level).length;

  function clearAttempt() {
    setResult(undefined);
    setError("");
    setPeeked(false);
    if (mine) setMine("");
    request.current = undefined;
  }
  function goTo(next: number) {
    recorder.current.cancel();
    setRecording(false);
    clearAttempt();
    const bounded = Math.max(0, Math.min(count - 1, next));
    setDirection(bounded >= index ? "forward" : "back");
    setIndex(bounded);
  }
  function chooseLevel(next: SupportLevel) {
    recorder.current.cancel();
    setRecording(false);
    clearAttempt();
    setWhole(false);
    setLevel(next);
    const open = firstOpenIndex(drill, count, next);
    setIndex(open < 0 ? 0 : open);
  }
  function startWhole() {
    recorder.current.cancel();
    setRecording(false);
    clearAttempt();
    setWhole(true);
  }

  async function send(blob: Blob) {
    setBusy(true);
    setError("");
    try {
      // Looking at a hidden sentence makes the attempt a text-only one.
      const sentLevel: SupportLevel = !whole && level === 3 && peeked ? 2 : level;
      const target = whole ? "all" : String(index);
      const key = `${target}:${sentLevel}:${blob.size}`;
      if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
      const form = new FormData();
      form.set("audio", blob, "speech");
      form.set("request_id", request.current.id);
      form.set("target", target);
      form.set("level", String(whole ? 3 : sentLevel));
      const checked = await api<DailySpeakResult>(`/daily-meets/${entry.id}/speak`, { method: "POST", body: form });
      setResult(checked);
      setDrill(checked.drill);
      onProgress(checked.drill);
      request.current = undefined;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function stopRecording() {
    try {
      const blob = await recorder.current.stop();
      setRecording(false);
      setMine(URL.createObjectURL(blob));
      await send(blob);
    } catch (e) {
      setRecording(false);
      setError((e as Error).message);
    }
  }
  async function record() {
    if (busy) return;
    if (recording) {
      await stopRecording();
      return;
    }
    setResult(undefined);
    setError("");
    if (mine) setMine("");
    try {
      await recorder.current.start(() => void stopRecording());
      setRecording(true);
      setSeconds(0);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const micLabel = recording ? "หยุดและส่งเสียง" : "เริ่มอัดเสียง";
  const mic = (
    <div className="daily-drill-mic">
      <button type="button" className={`mic-button ${recording ? "recording" : ""}`} onClick={() => void record()} disabled={busy} aria-label={micLabel}>
        {recording ? <Square size={25} /> : busy ? <LoaderCircle className="spin" size={27} /> : <Mic size={28} />}
      </button>
      <div>
        <strong>{recording ? `กำลังอัด ${seconds} วินาที · แตะอีกครั้งเพื่อส่ง` : busy ? "กำลังฟังเสียงของคุณ…" : result ? "อัดอีกครั้งได้เสมอ" : "แตะไมค์แล้วพูด"}</strong>
        <small>{whole ? "พูดได้นานสุด 2 นาที ไม่ต้องตรงทุกคำ" : "ระบบตรวจจากเสียงจริง และไม่เก็บไฟล์เสียงของโหมดนี้"}</small>
      </div>
    </div>
  );
  const verdict = result && (
    <div className={`daily-drill-result ${result.passed ? "passed" : "retry"}`} role="status" aria-live="polite" data-testid="daily-drill-result">
      <div className="daily-drill-result-head">
        <span className="daily-drill-result-mark">{result.passed ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}</span>
        <strong>{!result.audio_clear ? "เสียงยังไม่ชัด ลองอัดใหม่" : result.passed ? (whole ? "เล่าทั้งเรื่องได้แล้ว" : "ผ่านประโยคนี้แล้ว") : whole ? "ยังขาดบางประเด็น" : "ยังไม่ตรงกับประโยค"}</strong>
      </div>
      {result.transcript && <p className="daily-drill-heard"><span>ที่ระบบได้ยิน</span>{result.transcript}</p>}
      {result.missing_words.length > 0 && <p className="daily-drill-missing"><span>{whole ? "ประเด็นที่ยังไม่ได้พูด" : "คำที่ยังไม่ได้ยิน"}</span>{result.missing_words.map((word) => <mark key={word}>{word}</mark>)}</p>}
      {result.tip_th && <p>{result.tip_th}</p>}
      {result.pronunciation_th && <p className="daily-drill-pron">{result.pronunciation_th}</p>}
      {mine && <div className="audio-compare"><small>ฟังเสียงของคุณ เทียบกับต้นแบบ</small><audio controls src={mine} preload="metadata" /></div>}
    </div>
  );

  if (!count) {
    return <div className="card daily-drill"><p>บันทึกนี้ยังไม่มีประโยคให้ฝึก</p><button type="button" className="button" onClick={onExit}><ArrowLeft size={17} />กลับไปที่บันทึก</button></div>;
  }

  return (
    <section className="daily-drill" aria-labelledby="daily-drill-title">
      <div className="daily-drill-top">
        <button type="button" className="text-button" onClick={onExit}><ArrowLeft size={18} />กลับไปที่บันทึก</button>
        <span className="pill neutral">{whole ? "พูดรวมทั้งเรื่อง" : `ประโยค ${index + 1} / ${count}`}</span>
      </div>
      <div className="daily-drill-heading">
        <span className="eyebrow">SAY YOUR DAY, ONE SENTENCE AT A TIME</span>
        <h2 id="daily-drill-title">{entry.title || "Daily Meet"}</h2>
      </div>

      <div className="daily-drill-levels" role="radiogroup" aria-label="ระดับตัวช่วย">
        {SUPPORT_LEVELS.map((option) => (
          <button key={option.level} type="button" role="radio" aria-checked={!whole && level === option.level} className={!whole && level === option.level ? "selected" : ""} onClick={() => chooseLevel(option.level)}>
            <span>{option.level}</span><strong>{option.label}</strong>
          </button>
        ))}
        <button type="button" role="radio" aria-checked={whole} className={whole ? "selected" : ""} onClick={startWhole}>
          <span>{drill?.full_passed ? <Check size={13} aria-hidden="true" /> : 4}</span><strong>พูดรวม</strong>
        </button>
      </div>
      <p className="daily-drill-level-note">{whole ? "เล่าทั้งเรื่องรวดเดียวจากความจำ ไม่ต้องตรงทุกคำ ขอให้ครบประเด็นหลัก" : `${SUPPORT_LEVELS[level - 1].shows} · ผ่านแล้ว ${passedHere}/${count} ประโยคในระดับนี้`}</p>

      {!whole && (
        <ol className="daily-drill-dots" aria-label="ประโยคทั้งหมด">
          {sentences.map((item, i) => (
            <li key={`${i}-${item.en}`}>
              <button type="button" className={`${i === index ? "current" : ""} ${passedLevel(drill, i) >= level ? "passed" : ""}`} data-level={passedLevel(drill, i)} aria-label={`ประโยค ${i + 1}${passedLevel(drill, i) >= level ? " ผ่านแล้ว" : ""}`} aria-current={i === index ? "step" : undefined} onClick={() => goTo(i)}>{i + 1}</button>
            </li>
          ))}
        </ol>
      )}

      <ErrorMessage message={error} />

      {whole ? (
        <div className="card daily-drill-card" data-testid="daily-drill-whole">
          <div className="daily-drill-card-tools">
            <button type="button" className="text-button" aria-pressed={showOutline} onClick={() => setShowOutline(!showOutline)}>{showOutline ? <EyeOff size={16} /> : <Eye size={16} />}{showOutline ? "ซ่อนโครงเรื่องภาษาไทย" : "แสดงโครงเรื่องภาษาไทย"}</button>
          </div>
          {showOutline ? (
            <ol className="daily-drill-outline" lang="th">{sentences.map((item, i) => <li key={`${i}-${item.en}`}>{item.th || item.en}</li>)}</ol>
          ) : (
            <p className="daily-drill-hidden">ซ่อนโครงเรื่องแล้ว เล่าจากความจำได้เลย</p>
          )}
          {mic}
          {verdict}
          {result?.passed && <div className="daily-drill-done" role="status"><strong>เยี่ยม คุณเล่าเรื่องของวันนี้เป็นภาษาอังกฤษได้ทั้งเรื่อง</strong><button type="button" className="button primary" onClick={onExit}>กลับไปที่บันทึก <ArrowRight size={17} /></button></div>}
        </div>
      ) : roundDone && !result ? (
        <div className="card daily-drill-card daily-drill-done" data-testid="daily-drill-round-done" role="status">
          <Check size={40} aria-hidden="true" />
          <strong>ครบทุกประโยคในระดับ “{SUPPORT_LEVELS[level - 1].label}” แล้ว</strong>
          <p>{level < 3 ? "รอบต่อไปลดตัวช่วยลงหนึ่งขั้น ประโยคเดิมจะเริ่มติดปาก" : "พร้อมเล่าทั้งเรื่องรวดเดียวแล้ว"}</p>
          <div className="button-row">
            {level < 3 && <button type="button" className="button primary" onClick={() => chooseLevel((level + 1) as SupportLevel)}>รอบต่อไป: {SUPPORT_LEVELS[level].label} <ArrowRight size={17} /></button>}
            <button type="button" className={level < 3 ? "button" : "button primary"} onClick={startWhole}>พูดรวมทั้งเรื่อง</button>
            <button type="button" className="text-button" onClick={() => goTo(0)}><RotateCcw size={16} />ฝึกระดับนี้ซ้ำ</button>
          </div>
        </div>
      ) : sentence ? (
        <div className="card daily-drill-card" data-testid="daily-drill-sentence" data-direction={direction} key={`${level}-${index}`} ref={card}>
          {level === 3 && !peeked ? (
            <div className="daily-drill-hidden"><p>พูดประโยคนี้เป็นภาษาอังกฤษจากความหมายด้านล่าง</p><button type="button" className="text-button" onClick={() => setPeeked(true)}><Eye size={16} />แอบดูประโยค (รอบนี้จะนับเป็นระดับ 2)</button></div>
          ) : (
            <p className="daily-drill-en" lang="en">{sentence.en}</p>
          )}
          {level === 1 && (sentence.reading_th ? <p className="daily-drill-reading" lang="th" data-testid="daily-drill-reading"><span>คำอ่าน</span>{sentence.reading_th}</p> : <p className="daily-drill-reading missing">ประโยคนี้ยังไม่มีคำอ่าน กด “วิเคราะห์ประโยค” ที่หน้าบันทึกเพื่อเพิ่ม</p>)}
          {sentence.th && <p className="daily-drill-th" lang="th">{sentence.th}</p>}
          {sentence.grammar.length > 0 && (
            <div className="daily-grammar" aria-label="Grammar ของประโยคนี้">
              {sentence.grammar.map((unit) => <button type="button" key={unit.id} className="daily-grammar-chip" onClick={() => onOpenUnit(unit.id)} title="เปิดบทนี้ใน Learn Ebook"><span>{unit.level}</span>{unit.title}</button>)}
            </div>
          )}
          <VoiceButton text={sentence.en} voice={user.profile.voice} speed={user.profile.speed} label="ฟังต้นแบบ" />
          {mic}
          {verdict}
          <div className="daily-drill-nav">
            <button type="button" className="button" onClick={() => goTo(index - 1)} disabled={index === 0 || busy || recording}><ArrowLeft size={17} />ก่อนหน้า</button>
            {index < count - 1
              ? <button type="button" className={result?.passed ? "button primary" : "button"} onClick={() => goTo(index + 1)} disabled={busy || recording}>{result?.passed ? "ประโยคถัดไป" : "ข้ามไปก่อน"} <ArrowRight size={17} /></button>
              : <button type="button" className={result?.passed ? "button primary" : "button"} onClick={() => { clearAttempt(); const open = firstOpenIndex(drill, count, level); if (open >= 0) setIndex(open); }} disabled={busy || recording}>{firstOpenIndex(drill, count, level) < 0 ? "สรุปรอบนี้" : "กลับไปประโยคที่ยังไม่ผ่าน"} <ArrowRight size={17} /></button>}
          </div>
        </div>
      ) : null}
    </section>
  );
}
