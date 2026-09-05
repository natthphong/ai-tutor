"use client";
import { useState } from "react";
import { ArrowRight, Check, Headphones, LoaderCircle } from "lucide-react";
import { post } from "@/lib/api";
import { ErrorMessage, Mascot } from "./ui";
import type { User } from "@/lib/types";
export default function Auth({ onLogin }: { onLogin: () => void }) {
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (register) {
        await post("/auth/register", data);
        setSuccess("สมัครสำเร็จ เข้าสู่ระบบด้วยบัญชีใหม่ได้เลย");
        setRegister(false);
      } else {
        await post("/auth/login", data);
        onLogin();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-art">
        <a className="brand">
          <Mascot size={52} />
          <span>
            toko<span className="brand-loop">loop</span>
            <i />
          </span>
        </a>
        <div className="auth-message">
          <span className="eyebrow">YOUR SPEAKING SPACE</span>
          <h1>
            A little practice.
            <br />A lot more
            <br />
            <span>confidence.</span>
          </h1>
          <p>
            เริ่มจากคำแรก จนถึงบทสนทนาที่เป็นคุณ
            <br />
            เพื่อนฝึกพูดของคุณพร้อมฟังเสมอ
          </p>
          <div className="auth-duck">
            <Mascot size={280} />
            <div className="speech-label">
              Let’s talk! <span>✦</span>
            </div>
          </div>
        </div>
        <div className="auth-footer">
          <Headphones size={17} /> พื้นที่เล็ก ๆ สำหรับการเติบโตของคุณ
        </div>
      </div>
      <div className="auth-form-area">
        <div className="auth-form">
          <span className="pill neutral">
            ENGLISH, ONE CONVERSATION AT A TIME
          </span>
          <h2>{register ? "เริ่มบทสนทนาแรก" : "ยินดีต้อนรับกลับมา"}</h2>
          <p>
            {register
              ? "สร้างบัญชีด้วยรหัสเชิญจากผู้ดูแล"
              : "วันนี้มาฝึกพูดด้วยกันอีกนิดนะ"}
          </p>
          <form onSubmit={submit}>
            <label>
              ชื่อผู้ใช้
              <input
                name="username"
                autoComplete="username"
                placeholder="ชื่อผู้ใช้ของคุณ"
                required
                minLength={3}
                maxLength={40}
              />
            </label>
            <label>
              รหัสผ่าน
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                placeholder="รหัสผ่าน"
                required
                minLength={register ? 10 : 1}
                maxLength={256}
              />
            </label>
            {register && (
              <label>
                รหัสเชิญ
                <input
                  name="invitation"
                  autoComplete="off"
                  placeholder="วางรหัสเชิญที่ได้รับ"
                  required
                />
              </label>
            )}
            <ErrorMessage message={error} />
            {success && (
              <div className="success">
                <Check size={18} />
                {success}
              </div>
            )}
            <button className="button primary wide" disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={20} />
              ) : (
                <>
                  {register ? "สร้างบัญชี" : "เข้าสู่พื้นที่ฝึกพูด"}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
          <p className="auth-switch">
            {register ? "มีบัญชีแล้ว?" : "มีรหัสเชิญแล้ว?"}{" "}
            <button
              className="text-button"
              onClick={() => {
                setRegister(!register);
                setError("");
                setSuccess("");
              }}
            >
              {register ? "เข้าสู่ระบบ" : "สร้างบัญชีใหม่"}
            </button>
          </p>
          <div className="auth-note">
            <span>✦</span> ไม่ต้องพูดให้สมบูรณ์แบบ แค่เริ่มพูดก็พอ
          </div>
        </div>
      </div>
    </div>
  );
}
export function ChangePassword({
  user,
  onDone,
}: {
  user: User;
  onDone: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="setup-page">
      <div className="card setup-card">
        <Mascot size={110} />
        <span className="eyebrow">WELCOME, {user.username}</span>
        <h1>ตั้งรหัสผ่านของคุณก่อน</h1>
        <p>
          ใช้รหัสใหม่อย่างน้อย 10 ตัวอักษร
          แล้วเริ่มสร้างรหัสเชิญหรือฝึกพูดได้เลย
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await post(
                "/auth/change-password",
                Object.fromEntries(new FormData(e.currentTarget)),
              );
              onDone();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            รหัสปัจจุบัน
            <input
              name="current"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            รหัสใหม่
            <input
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
            />
          </label>
          <ErrorMessage message={error} />
          <button className="button primary wide" disabled={busy}>
            บันทึกและเริ่มต้น <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
