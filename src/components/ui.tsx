"use client";
import { ArrowRight, LoaderCircle, Volume2 } from "lucide-react";
import { useState, useRef } from "react";
import { post, awaitJob } from "@/lib/api";
export function Mascot({
  size = 80,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/mascot.png"
      width={size}
      height={size}
      className={`mascot ${className}`}
      alt="Loop เป็ดเพื่อนฝึกพูด"
    />
  );
}
export function Loading() {
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={28} />
      <span>กำลังเตรียมพื้นที่ฝึกของคุณ…</span>
    </div>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <div className="error" role="alert">
      {message}
    </div>
  ) : null;
}
export function Empty({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Mascot size={110} />
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
export function SectionTitle({
  label,
  title,
  action,
}: {
  label?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {label && <span className="eyebrow">{label}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
export function Arrow() {
  return <ArrowRight size={18} />;
}
export function VoiceButton({
  text,
  voice = "Kore",
  speed = 1,
  label = "ฟังตัวอย่าง",
}: {
  text: string;
  voice?: string;
  speed?: number;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [src, setSrc] = useState("");
  const ref = useRef<HTMLAudioElement>(null);
  async function play() {
    setBusy(true);
    setError("");
    try {
      if (src && ref.current) {
        ref.current.playbackRate = speed;
        await ref.current.play();
        return;
      }
      let r = await post<{ audio_id?: string; job_id?: string }>("/audio/tts", {
        text,
        voice,
      });
      if (r.job_id) r = await awaitJob<{ audio_id: string }>(r.job_id);
      setSrc(`/api/audio/${r.audio_id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="voice-control">
      <button
        type="button"
        className="text-button"
        onClick={play}
        disabled={busy}
      >
        {busy ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <Volume2 size={18} />
        )}{" "}
        {busy ? "กำลังเตรียมเสียง…" : error ? "ลองสร้างเสียงอีกครั้ง" : label}
      </button>
      {src && (
        <audio
          ref={ref}
          src={src}
          controls
          onCanPlay={() => {
            if (ref.current) {
              ref.current.playbackRate = speed;
              void ref.current.play().catch(() => {});
            }
          }}
        />
      )}
      <ErrorMessage message={error} />
    </div>
  );
}
