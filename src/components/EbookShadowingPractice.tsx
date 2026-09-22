"use client";

import { ArrowLeft, Check, Headphones, LoaderCircle, Mic, Send, Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, post } from "@/lib/api";
import type { SessionData, User } from "@/lib/types";
import { VoiceRecorder } from "@/features/audio/recorder";
import { ErrorMessage, Loading, VoiceButton } from "./ui";

type ShadowLine = { sentence: string; meaning?: string; source_page?: number; audio_id?: string };
type ShadowState = Record<string, unknown> & {
  shadow_index?: number;
  shadow_lines?: ShadowLine[];
  shadow_meanings?: string[];
  shadowing_lines?: ShadowLine[];
  target_line?: string;
  target_meaning?: string;
  ebook_activity?: string;
};

function recordState(data: SessionData): ShadowState {
  return data.session.state as ShadowState;
}

function lineFrom(raw: unknown): ShadowLine | undefined {
  if (typeof raw === "string") return { sentence: raw };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const value = raw as Record<string, unknown>;
  const sentence = [value.sentence, value.lesson_example, value.english, value.text].find((item): item is string => typeof item === "string" && item.length > 0);
  if (!sentence) return undefined;
  return { sentence, meaning: typeof value.meaning === "string" ? value.meaning : typeof value.meaning_th === "string" ? value.meaning_th : typeof value.thai === "string" ? value.thai : undefined, source_page: typeof value.source_page === "number" ? value.source_page : typeof value.page === "number" ? value.page : undefined, audio_id: typeof value.audio_id === "string" ? value.audio_id : undefined };
}

function currentLine(data: SessionData): ShadowLine {
  const state = recordState(data);
  const rawLines = state.shadowing_lines || state.shadow_lines || (state as Record<string, unknown>).shadowing || [];
  const lines = Array.isArray(rawLines) ? rawLines.map(lineFrom).filter((line): line is ShadowLine => Boolean(line)) : [];
  const index = Math.max(0, Math.min(2, Number(state.shadow_index || 0)));
  const meaning = Array.isArray(state.shadow_meanings) && typeof state.shadow_meanings[index] === "string" ? state.shadow_meanings[index] : undefined;
  const selected = lines[index];
  if (selected) return { ...selected, meaning: selected.meaning || meaning };
  const fromTurns = data.turns.filter((turn) => turn.role === "model").at(-1);
  return lines[index] || {
    sentence: typeof state.target_line === "string" && state.target_line ? state.target_line : fromTurns?.text || "Repeat the sentence from this lesson.",
    meaning: typeof state.target_meaning === "string" ? state.target_meaning : fromTurns?.text_th || "",
    audio_id: fromTurns?.audio_id,
  };
}

export default function EbookShadowingPractice({
  id,
  user,
  data,
  reload,
  onBack,
}: {
  id: string;
  user: User;
  data: SessionData;
  reload: () => Promise<void>;
  onBack: () => void;
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [typed, setTyped] = useState("");
  const [audioId, setAudioId] = useState("");
  const [serverLine, setServerLine] = useState<{ index: number; line: ShadowLine }>();
  const recorder = useRef(new VoiceRecorder());
  const line = currentLine(data);
  const rawShadowIndex = Math.max(0, Number(recordState(data).shadow_index || 0));
  const shadowIndex = Math.min(2, rawShadowIndex);
  const activeLine = serverLine?.index === shadowIndex ? serverLine.line : line;
  const complete = data.session.status === "completed" || rawShadowIndex >= 3;

  useEffect(() => () => recorder.current.cancel(), []);

  async function listen() {
    setBusy(true);
    setError("");
    try {
      const response = await post<{ audio_id?: string; target?: unknown; line?: unknown; sentence?: string; text?: string; thai?: string; meaning_th?: string }>(`/sessions/${id}/listen`, { request_id: crypto.randomUUID() });
      const next = lineFrom(response.target) || lineFrom(response.line) || lineFrom(response);
      if (next) {
        const resolved = { ...next, meaning: next.meaning || response.meaning_th || response.thai || activeLine.meaning };
        setServerLine({ index: shadowIndex, line: resolved });
        if (resolved.sentence !== activeLine.sentence) setNotice("The next lesson line is ready.");
      }
      setAudioId(response.audio_id || next?.audio_id || activeLine.audio_id || "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(blob?: Blob) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const requestId = crypto.randomUUID();
      if (blob) {
        const form = new FormData();
        form.set("audio", blob, "shadowing.wav");
        form.set("request_id", requestId);
        await api(`/sessions/${id}/turns`, { method: "POST", body: form });
      } else if (typed.trim()) {
        await post(`/sessions/${id}/turns`, { text: typed, request_id: requestId });
        setNotice("Typed answers help you follow along, but only a clear recorded attempt can complete this line.");
      }
      setTyped("");
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function record() {
    if (recording) {
      try {
        const blob = await recorder.current.stop();
        setRecording(false);
        await submit(blob);
      } catch (e) {
        setRecording(false);
        setError((e as Error).message);
      }
      return;
    }
    try {
      await recorder.current.start(() => void record());
      setRecording(true);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <div className="session-top"><button type="button" className="text-button" onClick={onBack}><ArrowLeft size={18} />Back to Learn Ebook</button><span className="pill purple">Listen & shadow</span><span className="pill neutral">Unit line {Math.min(3, shadowIndex + 1)} / 3</span></div>
      <div className="session-heading"><div><span className="eyebrow">LESSON-DERIVED SHADOWING</span><h1>{complete ? "Shadowing complete" : "Listen, then say it your way"}</h1><p>The sentence and Thai meaning stay visible while you practice.</p></div><Headphones size={48} color="#b79c46" aria-hidden="true" /></div>
      <ErrorMessage message={error} />
      {notice && <div className="notice" role="status" aria-live="polite">{notice}</div>}
      {complete ? <div className="card completion-card"><Check size={52} color="#71966a" /><h2>Three lines passed</h2><p>Your shadowing step is complete. Continue with the speaking round when you are ready.</p><button type="button" className="button primary" onClick={onBack}>Return to Learn Ebook</button></div> : <div className="ebook-shadow-session-grid"><section className="card listening-card ebook-shadow-session-card"><span className="eyebrow">LINE {shadowIndex + 1} OF 3</span><h2>{activeLine.sentence}</h2>{activeLine.meaning && <p lang="th">{activeLine.meaning}</p>}{activeLine.source_page && <small>Source: lesson example, page {activeLine.source_page}</small>}{audioId || activeLine.audio_id ? <audio controls preload="auto" src={`/api/audio/${audioId || activeLine.audio_id}`} aria-label="Shadowing source audio" /> : <VoiceButton text={activeLine.sentence} voice={user.profile.voice} speed={user.profile.speed} label="Play exact source line" />}<button type="button" className="button" onClick={() => void listen()} disabled={busy}><Volume2 size={18} />{busy ? "Preparing audio…" : "Listen to this line"}</button><div className="ebook-shadow-record"><button type="button" className={`mic-button ${recording ? "recording" : ""}`} aria-label={recording ? "Stop and submit recording" : "Record shadowing attempt"} disabled={busy} onClick={() => void record()}>{recording ? <Square size={24} /> : busy ? <LoaderCircle className="spin" size={25} /> : <Mic size={25} />}</button><strong>{recording ? "Recording… tap again to submit" : "Record your voice"}</strong></div><p className="fine-print">A typed answer can help with accessibility, but it never counts as shadowing mastery.</p><form className="text-compose" onSubmit={(event) => { event.preventDefault(); void submit(); }}><input aria-label="Type along with the shadowing line" value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Type along if you need to follow along" disabled={busy || recording} /><button type="submit" className="icon-button" aria-label="Send typed shadowing attempt" disabled={busy || recording || !typed.trim()}><Send size={18} /></button></form></section></div>}
    </>
  );
}
