"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, ArrowRight, Lightbulb } from "lucide-react";
import { api, post } from "@/lib/api";
import type { User, ReviewItem, Feedback } from "@/lib/types";
import { VoiceRecorder } from "@/features/audio/recorder";
import { Loading, Empty, ErrorMessage, VoiceButton } from "./ui";
import { FeedbackCard } from "./Practice";
export default function Review({
  user,
  onDone,
}: {
  user: User;
  onDone: () => void;
}) {
  const [items, setItems] = useState<ReviewItem[]>();
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [text, setText] = useState("");
  const [reveal, setReveal] = useState(false);
  const [result, setResult] = useState<{
    feedback: Feedback;
    due_at: string;
    rescheduled: boolean;
  }>();
  const recorder = useRef(new VoiceRecorder());
  useEffect(() => {
    api<ReviewItem[]>("/review")
      .then(setItems)
      .catch((e) => setError(e.message));
    const pause = () => {
      if (document.hidden) {
        recorder.current.cancel();
        setRecording(false);
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      recorder.current.cancel();
      document.removeEventListener("visibilitychange", pause);
    };
  }, []);
  if (!items)
    return (
      <>
        <Loading />
        <ErrorMessage message={error} />
      </>
    );
  const item = items[index];
  if (!item)
    return (
      <Empty
        title="ทบทวนครบแล้ว เก่งมาก!"
        detail="ระบบจะนัดเจอกับคำเหล่านี้อีกครั้งในเวลาที่เหมาะสม"
        action={
          <button className="button primary" onClick={onDone}>
            กลับแผนวันนี้ <ArrowRight size={18} />
          </button>
        }
      />
    );
  async function send(blob?: Blob) {
    setBusy(true);
    setError("");
    try {
      const data = {
        request_id: crypto.randomUUID(),
        text,
        hint_level: reveal ? 4 : 0,
      };
      let r: typeof result;
      if (blob) {
        const form = new FormData();
        form.set("audio", blob, "review");
        form.set("request_id", data.request_id);
        form.set("hint_level", String(data.hint_level));
        r = await api(`/review/${item.id}/answer`, {
          method: "POST",
          body: form,
        });
      } else r = await post(`/review/${item.id}/answer`, data);
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function stop() {
    try {
      const blob = await recorder.current.stop();
      setRecording(false);
      await send(blob);
    } catch (e) {
      setRecording(false);
      setError((e as Error).message);
    }
  }
  async function record() {
    try {
      if (recording) {
        await stop();
      } else {
        await recorder.current.start(() => void stop());
        setRecording(true);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">MAKE IT STICK</span>
        <h1>เรียกคำเดิม กลับมาใช้ใหม่</h1>
        <p>
          ข้อ {index + 1} จาก {items.length} · ลองนึกเองก่อนเปิดคำตอบ
        </p>
      </div>
      <div className="review-layout">
        <div className="card review-card">
          <span className="stat-icon orange">
            <RotateCcw size={27} />
          </span>
          <span className="pill neutral">
            {item.kind === "vocabulary" ? "คำและวลี" : "จากสิ่งที่เคยติดขัด"}
          </span>
          <h2>{item.prompt}</h2>
          <p>ลองพูดให้สื่อความหมายนี้ ด้วยประโยคของคุณ</p>
          {reveal && (
            <div className="example-card">
              <h3>{item.target}</h3>
              <p>{item.meaning}</p>
              <VoiceButton text={item.target} voice={user.profile.voice} />
            </div>
          )}
          <button
            className="text-button"
            onClick={async () => {try {await post(`/review/${item.id}/hint`,{});setReveal(true)}catch(e){setError((e as Error).message)}}}
            disabled={busy || recording}
          >
            <Lightbulb size={17} /> เปิดตัวช่วย (ยังไม่เลื่อนช่วงทบทวน)
          </button>
          <button
            className={`mic-button ${recording ? "recording" : ""}`}
            onClick={record}
            disabled={busy || !!result}
          >
            {recording ? <Square /> : <Mic />}
          </button>
          <span>
            {recording
              ? "กดเพื่อหยุดและส่ง"
              : busy
                ? "กำลังประเมิน"
                : "กดไมค์แล้วลองพูด"}
          </span>
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
              placeholder="หรือพิมพ์ฝึกความหมาย"
              maxLength={4000}
            />
            <button
              className="button small"
              disabled={busy || recording || !!result || !text}
            >
              ส่ง
            </button>
          </form>
          <ErrorMessage message={error} />
          {result && (
            <>
              <p>
                {result.rescheduled
                  ? `ทบทวนอีกครั้ง ${new Date(result.due_at).toLocaleDateString("th-TH")}`
                  : "เสียงยังไม่ชัด ลองอัดใหม่ได้เลย"}
              </p>
              <button
                className="button primary"
                onClick={() => {
                  if (result.feedback.correct && result.rescheduled) {
                    setIndex(index + 1);setReveal(false);
                  }
                  setResult(undefined);
                  setText("");
                }}
              >
                {result.feedback.correct && result.rescheduled
                  ? "ข้อถัดไป"
                  : "ลองอีกครั้ง"}{" "}
                <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>
        {result && <FeedbackCard feedback={result.feedback} user={user} />}
      </div>
    </>
  );
}
