"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  Square,
  Send,
  Lightbulb,
  RotateCcw,
  Check,
  Volume2,
  Headphones,
  MicOff,
  Pause,
  MessageCircle,
  LoaderCircle,
  Bookmark,
  ChevronDown,
  X,
} from "lucide-react";
import { api, post } from "@/lib/api";
import type { SessionData, User, Feedback, Attempt } from "@/lib/types";
import { VoiceRecorder } from "@/features/audio/recorder";
import { LiveVoice } from "@/features/audio/live";
import { Mascot, Loading, ErrorMessage, VoiceButton } from "./ui";
export default function Practice({
  id,
  user,
  onBack,
  onResume,
}: {
  id: string;
  user: User;
  onBack: () => void;
  onResume: (id:string) => void;
}) {
  const [data, setData] = useState<SessionData>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hint, setHint] = useState("");
  const [retry, setRetry] = useState("");
  const [live, setLive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [liveInput, setLiveInput] = useState("");
  const [liveOutput, setLiveOutput] = useState("");
  const [liveStatus, setLiveStatus] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [showText, setShowText] = useState(false);
  const [hintIdea, setHintIdea] = useState("");
  const [manualFeedback, setManualFeedback] = useState<Feedback>();
  const recorder = useRef(new VoiceRecorder());
  const liveRef = useRef<LiveVoice | undefined>(undefined);
  const chatEnd = useRef<HTMLDivElement>(null);
  const submitRef = useRef<(b: Blob) => void>(() => {});
  const [micNotice, setMicNotice] = useState("");
  const load = useCallback(async () => {
    try {
      setData(await api<SessionData>(`/sessions/${id}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    void load();
    const onVisibility = () => {
      if (document.hidden) {
        recorder.current.cancel();
        setRecording(false);
        liveRef.current?.stop();
        setMicNotice(
          "พักการฝึกเมื่อออกจากแอป กลับมาแล้วกดไมค์เพื่อเริ่มต่อได้",
        );
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      recorder.current.cancel();
      liveRef.current?.stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds(recorder.current.seconds), 200);
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [live]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [data?.turns.length, liveOutput]);
  async function send(blob?: Blob) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const requestId = crypto.randomUUID();
      let result: { id: string; feedback: Feedback };
      if (blob) {
        const form = new FormData();
        form.set("audio", blob, "speech");
        form.set("request_id", requestId);
        if (retry) form.set("retry_of", retry);
        result = await api(`/sessions/${id}/turns`, {
          method: "POST",
          body: form,
        });
      } else {
        result = await post(`/sessions/${id}/turns`, {
          text,
          request_id: requestId,
          retry_of: retry,
        });
      }
      setManualFeedback(result.feedback);
      setText("");
      setRetry("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  submitRef.current = (blob) => void send(blob);
  async function stopRecording() {
    try {
      const b = await recorder.current.stop();
      setRecording(false);
      submitRef.current(b);
    } catch (e) {
      setRecording(false);
      setError((e as Error).message);
    }
  }
  async function record() {
    setError("");
    setMicNotice("");
    if (recording) {
      await stopRecording();
      return;
    }
    try {
      await recorder.current.start(() => void stopRecording());
      setRecording(true);
      setSeconds(0);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function advance() {
    setBusy(true);
    setError("");
    try {
      await post(`/sessions/${id}/advance`, {});
      setHint("");
      setRetry("");
      setManualFeedback(undefined);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function getHint() {
    setBusy(true);
    setError("");
    try {
      const h = await post<{ level: number; text: string }>(
        `/sessions/${id}/hints`,
        { idea: hintIdea },
      );
      setHint(h.text);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function startLive() {
    setConnecting(true);
    setError("");
    setLiveStatus("กำลังเชื่อมต่อ");
    try {
      const instance = new LiveVoice(
        (event) => {
          if (event.ready) {
            setLive(true);
            setConnecting(false);
            setRemaining(event.seconds_remaining || 600);
            setLiveStatus("พร้อมฟังคุณแล้ว");
          }
          if (event.serverContent?.inputTranscription) {
            setLiveInput(
              (t) => t + event.serverContent!.inputTranscription!.text,
            );
            setLiveStatus("กำลังฟัง");
          }
          if (event.serverContent?.outputTranscription) {
            setLiveOutput(
              (t) => t + event.serverContent!.outputTranscription!.text,
            );
            setLiveStatus("Loop กำลังพูด");
          }
          if (event.serverContent?.interrupted) {
            setLiveStatus("กำลังฟัง");
            setLiveOutput("");
          }
          if (event.serverContent?.turnComplete) {
            setLiveInput("");
            setLiveOutput("");
            setLiveStatus("พร้อมฟังคุณแล้ว");
            void load();
          }
          if (event.error) setError(event.error);
          if (event.ended) setMicNotice(event.ended);
          if (event.reconnect)
            setMicNotice(
              "การเชื่อมต่อพักแล้ว กดเชื่อมต่อเพื่อฝึกต่อจากบทสนทนาเดิม",
            );
        },
        () => {
          setLive(false);
          setConnecting(false);
          setMuted(false);
          void load();
        },
      );
      liveRef.current = instance;
      await instance.start(id);
    } catch (e) {
      setConnecting(false);
      setError((e as Error).message);
    }
  }
  async function complete() {
    setBusy(true);
    setError("");
    try {
      await post(`/sessions/${id}/complete`, {});
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <>
        <Loading />
        <ErrorMessage message={error} />
      </>
    );
  const { session: s, lesson: l, attempts } = data;
  const last = attempts.at(-1);
  const feedback = manualFeedback || last?.feedback;
  const pattern = s.state.stage === "pattern";
  const drill = l.drills?.[s.state.step];
  const isLiveMode = s.mode === "live";
  const completeStatus = s.status === "completed";
  const subtitle = pattern
    ? "เรียน pattern"
    : s.state.stage === "drill"
      ? (
          {
            shadowing: "ฟังแล้วพูดตาม",
            substitution: "เปลี่ยนคำ ให้เป็นเรื่องของคุณ",
            transformation: "เปลี่ยนรูปแบบประโยค",
            rapid_response: "คิดแล้วตอบให้ทัน",
          } as Record<string, string>
        )[drill?.kind]
      : "ลองใช้ในบทสนทนา";
  return (
    <>
      <div className="session-top">
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={18} /> กลับพื้นที่เรียน
        </button>
        <span className="pill purple">
          {s.mode === "placement"
            ? "ประเมินระดับ"
            : l.level || user.profile.level}
        </span>
        <button
          className="text-button"
          onClick={complete}
          disabled={busy || live || connecting || completeStatus}
        >
          {completeStatus ? "จบการฝึกแล้ว" : "จบการฝึก"} <Check size={17} />
        </button>
      </div>
      <div className="session-heading">
        <div>
          <span className="eyebrow">
            {isLiveMode
              ? "LIVE CONVERSATION"
              : s.mode === "placement"
                ? "FIND YOUR STARTING POINT"
                : "YOUR NEXT CONVERSATION"}
          </span>
          <h1>
            {l.title ||
              (s.mode === "placement"
                ? "ลองเล่าเรื่องของคุณ"
                : isLiveMode
                  ? "Let’s talk, live."
                  : "คุยกับ Loop")}
          </h1>
          <p>{l.objective || "เล่าไอเดียของคุณ ฝึกสื่อสารให้คนฟังเข้าใจ"}</p>
        </div>
        <Mascot size={75} />
      </div>
      {l.id && (
        <div className="session-steps">
          {[
            ["pattern", "เรียน pattern"],
            ["drill", "ฝึกให้คล่อง"],
            ["conversation", "ใช้ในบทสนทนา"],
          ].map(([step, label], i) => (
            <div key={step} className={s.state.stage === step ? "active" : ""}>
              <span>{i + 1}</span>
              {label}
            </div>
          ))}
        </div>
      )}
      <ErrorMessage message={error} />
      {micNotice && (
        <div className="notice">
          {micNotice}
          <button
            aria-label="ปิดข้อความ"
            className="icon-button"
            onClick={() => setMicNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {completeStatus ? (
        <div className="card completion-card">
          <Mascot size={140} />
          <span className="eyebrow">ANOTHER STEP FORWARD</span>
          <h2>เก็บการฝึกวันนี้ไว้แล้ว</h2>
          <p>{s.summary?.message}</p>
          <div className="completion-stats">
            <div>
              <strong>{s.summary?.attempts || 0}</strong>
              <span>คำตอบที่ได้ลอง</span>
            </div>
            <div>
              <strong>{s.summary?.independent || 0}</strong>
              <span>ครั้งที่พูดเองได้</span>
            </div>
            <div>
              <strong>{s.summary?.mastered ? "✓" : "↗"}</strong>
              <span>
                {s.summary?.mastered
                  ? "พูดได้เองตามเกณฑ์"
                  : s.mode === "lesson" ? "เรียนแล้ว · กลับมาฝึกซ้ำได้" : "ยังฝึกต่อได้อีก"}
              </span>
            </div>
          </div>
          {s.summary?.level && <p>ระดับเริ่มต้นที่แนะนำ: {s.summary.level}</p>}
          {s.summary?.feedback ? (
            <><FeedbackCard feedback={s.summary.feedback} user={user} />{s.summary.feedback.retry_sentence && <button className="button primary" onClick={async()=>{try{const r=await post<{id:string}>(`/sessions/${id}/retry`,{});onResume(r.id)}catch(e){setError((e as Error).message)}}}><RotateCcw size={18}/>ฝึกประโยคนี้อีกครั้ง</button>}</>
          ) : (isLiveMode || s.scenario_id) ? (
            <p>
              กำลังเตรียม feedback หลังบทสนทนา{" "}
              <button className="text-button" onClick={load}>
                ตรวจสรุปอีกครั้ง
              </button>
            </p>
          ) : null}
          <button className="button primary" onClick={onBack}>
            กลับไปดูแผนวันนี้ <ArrowRight size={18} />
          </button>
        </div>
      ) : (
        <div className="session-grid">
          <div className="conversation-panel card">
            <div className="conversation-header">
              <span className="tutor-avatar">
                <Mascot size={40} />
              </span>
              <div>
                <strong>Loop</strong>
                <small>
                  <span className="live-dot" /> Your speaking buddy
                </small>
              </div>
              <span className="pill neutral">
                {isLiveMode ? "LIVE" : subtitle}
              </span>
            </div>
            {pattern ? (
              <div className="pattern-intro">
                <span className="eyebrow">A PATTERN YOU CAN MAKE YOUR OWN</span>
                <h2>{l.pattern}</h2>
                <p>{l.explanation}</p>
                <div className="example-card">
                  <h3>{l.example}</h3>
                  <p>{l.meaning}</p>
                  <VoiceButton
                    text={l.example}
                    voice={user.profile.voice}
                    speed={user.profile.speed}
                  />
                </div>
                <div className="tip-note">
                  <Lightbulb size={20} />
                  <span>ฟังความหมายก่อน แล้วลองพูดด้วยข้อมูลของคุณเอง</span>
                </div>
                <button
                  className="button primary"
                  onClick={advance}
                  disabled={busy}
                >
                  พร้อมแล้ว เริ่มฝึกพูด <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <>
                <div className="chat-scroll">
                  {s.state.stage === "drill" && drill && (
                    <div className="drill-instruction">
                      <span className="eyebrow">
                        {drill.kind.replace("_", " ")}
                      </span>
                      <h3>{drill.prompt}</h3>
                      {drill.target && (
                        <>
                          <p>{drill.target}</p>
                          <VoiceButton
                            text={drill.target}
                            voice={user.profile.voice}
                            speed={user.profile.speed}
                          />
                        </>
                      )}
                    </div>
                  )}
                  {data.turns.map((t) => (
                    <div className={`chat-turn ${t.role}`} key={t.id}>
                      {t.role === "model" && (
                        <span className="bubble-avatar">
                          <Mascot size={33} />
                        </span>
                      )}
                      <div className="bubble">
                        <p>{t.text}</p>
                        {t.audio_id ? (
                          <audio
                            controls
                            src={`/api/audio/${t.audio_id}`}
                            preload="none"
                          />
                        ) : (
                          t.role === "model" && (
                            <VoiceButton
                              text={t.text}
                              voice={user.profile.voice}
                              speed={user.profile.speed}
                              label="ฟัง"
                            />
                          )
                        )}
                      </div>
                    </div>
                  ))}
                  {liveInput && (
                    <div className="chat-turn user">
                      <div className="bubble">
                        <p>{liveInput}</p>
                      </div>
                    </div>
                  )}
                  {liveOutput && (
                    <div className="chat-turn model">
                      <div className="bubble">
                        <p>{liveOutput}</p>
                      </div>
                    </div>
                  )}
                  {busy && (
                    <div className="thinking">
                      <span />
                      <span />
                      <span /> Loop กำลังคิด
                    </div>
                  )}
                  <div ref={chatEnd} />
                </div>
                {isLiveMode && (live || connecting) ? (
                  <div className="live-controls">
                    <div className="audio-wave">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                    <strong>{liveStatus}</strong>
                    <span>
                      {Math.floor(remaining / 60)}:
                      {(remaining % 60).toString().padStart(2, "0")}{" "}
                      นาทีที่เหลือ
                    </span>
                    <div className="button-row">
                      <button
                        className="button"
                        onClick={() => {
                          setMuted(!muted);
                          liveRef.current?.mute(!muted);
                        }}
                      >
                        {muted ? <MicOff size={20} /> : <Mic size={20} />}{" "}
                        {muted ? "เปิดไมค์" : "ปิดไมค์"}
                      </button>
                      <button
                        className="button charcoal"
                        onClick={() => liveRef.current?.stop()}
                      >
                        <Pause size={19} /> พัก Live
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="input-panel">
                    {retry && (
                      <div className="retry-banner">
                        <RotateCcw size={17} />
                        <span>ลองพูดใหม่: {feedback?.retry_sentence}</span>
                        <button
                          className="icon-button"
                          aria-label="ยกเลิก retry"
                          onClick={() => setRetry("")}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}
                    {isLiveMode && (
                      <button
                        className="button charcoal wide"
                        onClick={startLive}
                        disabled={busy}
                      >
                        <Headphones size={20} /> เชื่อมต่อ Live
                      </button>
                    )}
                    <div className="mic-area">
                      <button
                        className={`mic-button ${recording ? "recording" : ""}`}
                        onClick={record}
                        disabled={
                          busy || (s.state.last_pass && !!l.id && !retry)
                        }
                        aria-label={
                          recording ? "หยุดและส่งเสียง" : "เริ่มอัดเสียง"
                        }
                      >
                        {recording ? (
                          <Square size={25} />
                        ) : busy ? (
                          <LoaderCircle className="spin" size={27} />
                        ) : (
                          <Mic size={28} />
                        )}
                      </button>
                      <div>
                        <strong>
                          {recording
                            ? `กำลังฟัง… ${seconds} วินาที`
                            : busy
                              ? "กำลังฟังคำตอบของคุณ"
                              : retry
                                ? "พูดอีกครั้งในแบบที่ชัดขึ้น"
                                : "กดไมค์ แล้วลองพูดได้เลย"}
                        </strong>
                        <small>
                          {recording
                            ? "กดอีกครั้งเพื่อหยุดและส่ง"
                            : "เสียงสั้น ๆ ก็เป็นการเริ่มต้นที่ดี"}
                        </small>
                      </div>
                      <button
                        className="icon-button"
                        aria-label="พิมพ์คำตอบ"
                        onClick={() => setShowText(!showText)}
                      >
                        <MessageCircle size={21} />
                      </button>
                    </div>
                    <label className="audio-upload">ใช้เสียงที่อัดไว้
                      <input type="file" accept="audio/*" aria-label="เลือกไฟล์เสียงที่อัดไว้" disabled={busy || recording || (s.state.last_pass && !!l.id && !retry)} onChange={(e)=>{const file=e.target.files?.[0];if(file)void send(file);e.target.value="";}} />
                    </label>
                    {showText && (
                      <form
                        className="text-compose"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void send();
                        }}
                      >
                        <input
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="พิมพ์คำตอบ (ไม่นับเป็น speaking mastery)"
                          maxLength={4000}
                        />
                        <button
                          className="icon-button"
                          aria-label="ส่งข้อความ"
                          disabled={
                            busy ||
                            !text.trim() ||
                            recording ||
                            (s.state.last_pass && !!l.id && !retry)
                          }
                        >
                          <Send size={19} />
                        </button>
                      </form>
                    )}
                    {s.state.last_pass && l.id && (
                      <button
                        className="button primary wide next-drill"
                        onClick={advance}
                        disabled={busy}
                      >
                        ลองโจทย์ถัดไป <ArrowRight size={18} />
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <aside className="coach-panel">
            {l.id && (
              <div className="card pattern-side">
                <span className="eyebrow">KEEP THIS PATTERN CLOSE</span>
                <h3>{l.pattern}</h3>
                <p>{l.meaning}</p>
                <button
                  className="text-button"
                  onClick={async () => {
                    try {
                      await post("/vocabulary", {
                        term:
                          l.example.length <= 120
                            ? l.example
                            : l.pattern.slice(0, 120),
                        meaning: l.meaning,
                        example: l.example,
                      });
                      setMicNotice("บันทึกไว้ในคลังและชุดทบทวนแล้ว");
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <Bookmark size={16} /> เก็บวลีนี้ไว้ฝึก
                </button>
              </div>
            )}
            <div className="card hint-card">
              <span className="eyebrow">
                <Lightbulb size={16} /> A LITTLE HELP
              </span>
              <h3>นึกคำไม่ออก ไม่เป็นไร</h3>
              <p>ค่อย ๆ ต่อจากไอเดีย เป็นคำ และเป็นประโยคของคุณ</p>
              <div className="hint-ladder">
                {["ไอเดีย", "คำสำคัญ", "Pattern", "ประโยค"].map((h, i) => (
                  <span
                    key={h}
                    className={s.state.hint_level > i ? "revealed" : ""}
                  >
                    {i + 1}
                    <small>{h}</small>
                  </span>
                ))}
              </div>
              <textarea
                className="idea-input"
                placeholder="บอกเป็นไทยได้ว่าอยากพูดอะไร"
                value={hintIdea}
                onChange={(e) => setHintIdea(e.target.value)}
                maxLength={500}
              />
              {hint && <div className="hint-result">{hint}</div>}
              <button
                className="button wide"
                onClick={getHint}
                disabled={busy || recording || live || pattern}
              >
                <Lightbulb size={17} />{" "}
                {s.state.hint_level >= 3
                  ? "ขอดูประโยคตัวอย่าง"
                  : "ช่วยคิดอีกนิด"}
              </button>
            </div>
            {feedback && !pattern && (
              <FeedbackCard
                feedback={feedback}
                user={user}
                attempt={last}
                onRetry={
                  feedback.retry_sentence
                    ? () => setRetry(last?.id || "")
                    : undefined
                }
              />
            )}
            <div className="coach-note">
              <Mascot size={55} />
              <p>
                It’s okay to pause.
                <br />
                <strong>Good things take practice.</strong>
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
export function FeedbackCard({
  feedback: f,
  user,
  attempt,
  onRetry,
}: {
  feedback: Feedback;
  user: User;
  attempt?: Attempt;
  onRetry?: () => void;
}) {
  return (
    <div className="card feedback-card">
      <span className="eyebrow">YOUR SPEAKING FEEDBACK</span>
      <h3>
        {attempt?.input_kind === "audio" && !f.audio_clear
          ? "ลองอัดให้ชัดอีกครั้ง"
          : f.correct
            ? "สื่อสารได้ดีแล้ว!"
            : "อีกนิด ประโยคจะชัดขึ้น"}
      </h3>
      {f.meaning && user.profile.thai_support && <p>{f.meaning}</p>}
      {f.corrections.map((c, i) => (
        <div className="correction" key={i}>
          <span className={`pill ${c.kind === "grammar" ? "orange" : "green"}`}>
            {c.kind === "grammar"
              ? "ไวยากรณ์"
              : c.kind === "natural"
                ? "ฟังเป็นธรรมชาติขึ้น"
                : "ใช้ในงานได้สุภาพขึ้น"}
          </span>
          <div>
            <del>{c.original}</del>
            <ArrowRight size={14} />
            <strong>{c.corrected}</strong>
          </div>
          <p>{c.reason}</p>
        </div>
      ))}
      {f.pronunciation && (
        <div className="pronunciation-note">
          <Volume2 size={18} />
          <p>{f.pronunciation}</p>
        </div>
      )}
      {f.retry_sentence && (
        <>
          <blockquote>{f.retry_sentence}</blockquote>
          <VoiceButton
            text={f.retry_sentence}
            voice={user.profile.voice}
            speed={user.profile.speed}
          />
          {onRetry && (
            <button className="button primary wide" onClick={onRetry}>
              <RotateCcw size={17} /> ลองพูดใหม่ตอนนี้
            </button>
          )}
        </>
      )}
      {attempt?.audio_id && (
        <div className="audio-compare">
          <small>ฟังเสียงของคุณ</small>
          <audio
            controls
            src={`/api/audio/${attempt.audio_id}`}
            preload="none"
          />
        </div>
      )}
    </div>
  );
}
