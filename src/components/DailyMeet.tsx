"use client";

import { ArrowLeft, Headphones, MessagesSquare, Mic, Plus, Save, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, awaitJob, post } from "@/lib/api";
import type { DailyDrillProgress, DailyEntry, User } from "@/lib/types";
import DailyDrill, { passedLevel } from "./DailyDrill";
import { ErrorMessage, Loading, VoiceButton } from "./ui";

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

/** Splits long text so each listening button stays within the voice limit. */
function audioChunks(text: string): string[] {
  const chunks: string[] = [];
  let chunk = "";
  for (const word of text.split(/\s+/)) {
    if ((chunk + " " + word).length > 1400 && chunk) {
      chunks.push(chunk);
      chunk = "";
    }
    chunk += (chunk ? " " : "") + word;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

export default function DailyMeet({
  user,
  resume,
  openUnit,
}: {
  user: User;
  resume: (id: string) => void;
  openUnit: (unitId: string) => void;
}) {
  const [entries, setEntries] = useState<DailyEntry[]>();
  const [selected, setSelected] = useState<DailyEntry>();
  const [day, setDay] = useState(today);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [drilling, setDrilling] = useState(false);
  const requestId = useRef("");
  const analyzeId = useRef("");
  const key = `toko-daily-job:${user.id}`;

  async function load() {
    setEntries(await api<DailyEntry[]>("/daily-meets"));
  }

  async function watch(job: string) {
    let entry: DailyEntry;
    try {
      entry = await awaitJob<DailyEntry>(job);
    } catch (e) {
      const jobState = await api<{ status: string }>(`/jobs/${job}`).catch(() => null);
      if (jobState?.status === "failed") {
        localStorage.removeItem(key);
        requestId.current = "";
      }
      throw e;
    }
    localStorage.removeItem(key);
    localStorage.removeItem(key + ":draft");
    setSelected(entry);
    setShowForm(false);
    setSource("");
    requestId.current = "";
    await load();
  }

  useEffect(() => {
    let active = true;
    try {
      const draft = JSON.parse(localStorage.getItem(key + ":draft") || "null");
      if (draft) {
        setDay(draft.day);
        setTitle(draft.title);
        setSource(draft.source);
        setShowForm(true);
      }
    } catch {
      // A broken local draft must not block the page.
    }
    void load().catch((e) => setError(e.message));
    const pending = localStorage.getItem(key);
    if (pending) {
      setBusy(true);
      void watch(pending)
        .catch((e) => { if (active) setError(e.message); })
        .finally(() => { if (active) setBusy(false); });
    }
    return () => { active = false; };
    // Only the learner identity should reload the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      localStorage.setItem(key + ":draft", JSON.stringify({ day, title, source }));
      requestId.current ||= crypto.randomUUID();
      const result = await post<{ job_id: string }>("/daily-meets", { day, title, source, request_id: requestId.current });
      localStorage.setItem(key, result.job_id);
      await watch(result.job_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function patch(entry: DailyEntry) {
    return api<DailyEntry>(`/daily-meets/${entry.id}`, { method: "PATCH", body: JSON.stringify({ title: entry.title, english: entry.english, thai: entry.thai }) });
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      setSelected(await patch(selected));
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Entries written before sentence practice existed have no sentence list.
  // Saving them unchanged makes the server split the text, without an AI call.
  async function open(entry: DailyEntry) {
    setSelected(entry);
    setDrilling(false);
    if (entry.sentences?.length) return;
    try {
      setSelected(await patch(entry));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function analyze() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const saved = await patch(selected);
      analyzeId.current ||= crypto.randomUUID();
      const job = await post<{ job_id: string }>(`/daily-meets/${saved.id}/analyze`, { request_id: analyzeId.current });
      setSelected(await awaitJob<DailyEntry>(job.job_id));
      analyzeId.current = "";
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function startDrill() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      // Save edits first so the sentences on screen match the ones checked.
      setSelected(await patch(selected));
      setDrilling(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function practice(mode: string) {
    if (!selected) return;
    setBusy(true);
    try {
      await patch(selected);
      const result = await post<{ id: string }>(`/daily-meets/${selected.id}/sessions`, { mode, request_id: crypto.randomUUID() });
      resume(result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function keepProgress(drill: DailyDrillProgress) {
    setSelected((current) => current ? { ...current, drill } : current);
    setEntries((current) => current?.map((entry) => entry.id === selected?.id ? { ...entry, drill } : entry));
  }

  if (selected && drilling) {
    return <DailyDrill entry={selected} user={user} onProgress={keepProgress} onOpenUnit={openUnit} onExit={() => setDrilling(false)} />;
  }

  const sentences = selected?.sentences || [];
  const mastered = sentences.filter((_, index) => passedLevel(selected?.drill, index) >= 3).length;
  const started = sentences.filter((_, index) => passedLevel(selected?.drill, index) >= 1).length;

  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">YOUR DAY, YOUR ENGLISH</span>
        <h1>Daily Meet</h1>
        <p>เขียนเรื่องวันนี้หรือบันทึกประชุมเป็นไทยหรือผสมอังกฤษ Loop เรียบเรียงเป็นอังกฤษที่พูดได้จริง บอกว่าแต่ละประโยคใช้ grammar บทไหน แล้วฝึกพูดทีละประโยคจนเล่าได้ทั้งเรื่อง</p>
      </div>
      <ErrorMessage message={error} />
      <div className="button-row">
        <button type="button" className="button primary" disabled={busy} onClick={() => { setShowForm(true); setSelected(undefined); requestId.current = ""; }}><Plus size={18} />เขียนบันทึกใหม่</button>
        {(selected || showForm) && <button type="button" className="text-button" disabled={busy} onClick={() => { setSelected(undefined); setShowForm(false); }}><ArrowLeft size={18} />บันทึกทุกวัน</button>}
      </div>
      {busy && <div className="notice" role="status">Loop กำลังเรียบเรียงหรือบันทึก… งานที่เริ่มแล้วจะกลับมาตรวจต่อได้หลัง reload</div>}

      {showForm ? (
        <form className="card daily-editor" onSubmit={(event) => { event.preventDefault(); void generate(); }}>
          <label>วันที่<input type="date" required value={day} onChange={(event) => { setDay(event.target.value); requestId.current = ""; }} /></label>
          <label>หัวข้อ<input value={title} maxLength={120} onChange={(event) => { setTitle(event.target.value); requestId.current = ""; }} placeholder="เช่น Daily standup — ระบบโอนเงิน" /></label>
          <label>เรื่องที่อยากเล่า<textarea required value={source} maxLength={6000} onChange={(event) => { setSource(event.target.value); requestId.current = ""; }} placeholder="วันนี้แก้ retry ของ payment API แล้ว แต่ยังรอ confirm จากทีม QA พรุ่งนี้จะ…" rows={9} /></label>
          <small>{Array.from(source).length}/6,000 ตัวอักษร · พิมพ์ไทยปนอังกฤษได้ Loop จะเก็บต้นฉบับไว้ด้วย</small>
          <button className="button primary" disabled={busy || source.trim().length < 3}>เรียบเรียงและบันทึกเป็นอังกฤษ</button>
        </form>
      ) : selected ? (
        <div className="daily-entry-view">
          <div className="card daily-editor">
            <span className="eyebrow">{selected.day}</span>
            <label>หัวข้อ<input value={selected.title} maxLength={120} onChange={(event) => setSelected({ ...selected, title: event.target.value })} /></label>
            <details><summary>ดูต้นฉบับไทย / ไทยผสมอังกฤษ</summary><p className="preserve-lines">{selected.source}</p></details>
          </div>

          <section className="card daily-sentences" aria-labelledby="daily-sentences-title">
            <div className="daily-sentences-head">
              <div>
                <span className="eyebrow">SENTENCE BY SENTENCE</span>
                <h2 id="daily-sentences-title">ประโยคของวันนี้ {sentences.length > 0 && <small>{sentences.length} ประโยค</small>}</h2>
                <p>{sentences.length ? `พูดได้แล้ว ${started}/${sentences.length} ประโยค · พูดจากความจำได้ ${mastered}/${sentences.length}${selected.drill?.full_passed ? " · เล่าทั้งเรื่องผ่านแล้ว" : ""}` : "กำลังแบ่งข้อความเป็นประโยค…"}</p>
              </div>
              <button type="button" className="button primary" disabled={busy || !sentences.length} onClick={() => void startDrill()}><Mic size={18} />ฝึกพูดทีละประโยค</button>
            </div>
            {!selected.analyzed && sentences.length > 0 && (
              <div className="daily-analyze" role="note">
                <p>บันทึกนี้ยังไม่มีคำอ่าน ความหมายรายประโยค และ grammar ของแต่ละประโยค ฝึกพูดได้เลย หรือให้ Loop วิเคราะห์ก่อน (ใช้ AI 1 ครั้ง)</p>
                <button type="button" className="button" disabled={busy} onClick={() => void analyze()}><Sparkles size={17} />วิเคราะห์ประโยค</button>
              </div>
            )}
            <ol className="daily-sentence-list">
              {sentences.map((sentence, index) => (
                <li key={`${index}-${sentence.en}`} data-testid="daily-sentence" data-level={passedLevel(selected.drill, index)}>
                  <span className="daily-sentence-number" aria-label={`ผ่านระดับ ${passedLevel(selected.drill, index)} จาก 3`}>{index + 1}</span>
                  <div>
                    <p className="daily-sentence-en" lang="en">{sentence.en}</p>
                    {sentence.th && <p className="daily-sentence-th" lang="th">{sentence.th}</p>}
                    {sentence.grammar.length > 0 && (
                      <div className="daily-grammar" aria-label="Grammar ของประโยคนี้">
                        {sentence.grammar.map((unit) => <button type="button" key={unit.id} className="daily-grammar-chip" onClick={() => openUnit(unit.id)} title={unit.title_th || "เปิดบทนี้ใน Learn Ebook"}><span>{unit.level}</span>{unit.title}</button>)}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <details className="card daily-editor daily-edit-text">
            <summary>แก้ไขข้อความอังกฤษและคำแปล</summary>
            <p className="fine-print">เมื่อแก้ข้อความอังกฤษ ประโยคที่เปลี่ยนจะถูกแบ่งใหม่ และความคืบหน้าการฝึกพูดของบันทึกนี้จะเริ่มใหม่</p>
            <div className="daily-columns">
              <label>อังกฤษที่นำไปพูดได้<textarea rows={10} value={selected.english} onChange={(event) => setSelected({ ...selected, english: event.target.value })} /></label>
              <label>คำแปลไทย<textarea rows={10} value={selected.thai} onChange={(event) => setSelected({ ...selected, thai: event.target.value })} /></label>
            </div>
            <button type="button" className="button" onClick={() => void save()} disabled={busy}><Save size={18} />บันทึกข้อความที่แก้</button>
          </details>

          <div className="card daily-editor">
            <div className="daily-reading">
              <h3>ฟังบันทึกภาษาอังกฤษ</h3>
              {audioChunks(selected.english).map((chunk, index) => <VoiceButton key={`${selected.id}:${index}:${chunk}`} text={chunk} voice={user.profile.voice} speed={user.profile.speed} label={`ฟังช่วงที่ ${index + 1}`} />)}
            </div>
            <div className="daily-phrases">
              <h3>วลีที่หยิบไปใช้ได้อีก</h3>
              {selected.phrases?.map((phrase, index) => <div key={index}><strong>{phrase.en}</strong><p>{phrase.th}</p><small>{phrase.note}</small><VoiceButton text={phrase.en} voice={user.profile.voice} speed={user.profile.speed} /></div>)}
            </div>
            <h3>คุยต่อเรื่องนี้กับ Loop</h3>
            <div className="button-row">
              <button type="button" className="button primary" disabled={busy} onClick={() => void practice("free")}><MessagesSquare size={18} />คุยเรื่องวันนี้ พร้อมเสียงตอบ</button>
              <button type="button" className="button charcoal" disabled={busy} onClick={() => void practice("live")}><Headphones size={18} />Live เรื่องวันนี้</button>
              <button type="button" className="button" disabled={busy} onClick={() => void practice("listening")}>ฝึกฟังเรื่องวันนี้</button>
            </div>
          </div>
        </div>
      ) : !entries ? (
        <Loading />
      ) : (
        <div className="daily-list">
          {entries.length === 0 && <div className="card daily-editor"><h2>เริ่มจากเรื่องสั้น ๆ ของวันนี้</h2><p>สิ่งที่ทำ ปัญหาที่เจอ และสิ่งที่จะทำต่อ ก็เป็นบทฝึกพูดที่มีประโยชน์แล้ว</p></div>}
          {entries.map((entry) => (
            <button type="button" className="card daily-entry" key={entry.id} onClick={() => void open(entry)}>
              <span>{entry.day}{entry.sentences?.length ? ` · ${entry.sentences.length} ประโยค` : ""}{entry.drill?.full_passed ? " · เล่าทั้งเรื่องผ่านแล้ว" : ""}</span>
              <strong>{entry.title}</strong>
              <p>{entry.english.slice(0, 180)}{entry.english.length > 180 ? "…" : ""}</p>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
