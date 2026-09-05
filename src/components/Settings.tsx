"use client";
import { useState, useEffect } from "react";
import {
  Check,
  Plus,
  Copy,
  LogOut,
  Shield,
  Wallet,
  Volume2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { api, post } from "@/lib/api";
import type { User, Usage } from "@/lib/types";
import { ErrorMessage, SectionTitle } from "./ui";
export default function SettingsPage({
  user,
  onUpdate,
  onLogout,
}: {
  user: User;
  onUpdate: () => void;
  onLogout: () => void;
}) {
  const [profile, setProfile] = useState(user.profile);
  const [usage, setUsage] = useState<Usage>();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passwordChanged,setPasswordChanged]=useState(false);
  const [code, setCode] = useState("");
  const [invitations, setInvitations] = useState<
    { id: string; expires_at: string; used: boolean; revoked: boolean }[]
  >([]);
  const loadInvites = () =>
    api<typeof invitations>("/admin/invitations").then(setInvitations);
  useEffect(() => {
    api<Usage>("/usage")
      .then(setUsage)
      .catch((e) => setError(e.message));
    if (user.role === "admin")
      void loadInvites().catch((e) => setError(e.message));
  }, [user.role]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const { level, ...changes } = profile;
      await api("/profile", { method: "PATCH", body: JSON.stringify(changes) });
      setSaved(true);
      onUpdate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">MAKE YOURSELF AT HOME</span>
        <h1>จังหวะการเรียนในแบบคุณ</h1>
        <p>ปรับเสียง เป้าหมาย และเวลาฝึกให้เหมาะกับทุกวัน</p>
      </div>
      <ErrorMessage message={error} />
      <div className="settings-grid">
        <form className="card settings-form" onSubmit={save}>
          <SectionTitle title="การฝึกของคุณ" label="LEARNING PREFERENCES" />
          <label>
            เป้าหมายที่อยากไปถึง
            <textarea
              value={profile.goal || ""}
              maxLength={1000}
              onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
              placeholder="อยากอธิบายงานและคุยประชุมอย่างมั่นใจ"
            />
          </label>
          <label>
            เวลาเรียนต่อวัน
            <select
              value={profile.daily_minutes}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  daily_minutes: Number(e.target.value),
                })
              }
            >
              <option value={15}>15 นาที</option>
              <option value={30}>30 นาที</option>
              <option value={60}>60 นาที</option>
            </select>
          </label>
          <label className="toggle-label">
            <span>
              แสดงคำอธิบายภาษาไทย<small>ลดความช่วยเหลือได้เมื่อคุณพร้อม</small>
            </span>
            <input
              type="checkbox"
              checked={profile.thai_support}
              onChange={(e) =>
                setProfile({ ...profile, thai_support: e.target.checked })
              }
            />
          </label>
          <div className="divider" />
          <SectionTitle title="เสียงเพื่อนฝึกพูด" />
          <div className="field-grid">
            <label>
              เสียง
              <select
                value={profile.voice}
                onChange={(e) =>
                  setProfile({ ...profile, voice: e.target.value })
                }
              >
                <option value="Kore">Kore · มั่นใจ</option>
                <option value="Puck">Puck · สดใส</option>
                <option value="Aoede">Aoede · สบาย ๆ</option>
              </select>
            </label>
            <label>
              ความเร็วเล่นเสียง
              <select
                value={profile.speed}
                onChange={(e) =>
                  setProfile({ ...profile, speed: Number(e.target.value) })
                }
              >
                {[0.5, 0.75, 1, 1.25, 1.5].map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="divider" />
          <SectionTitle title="วงเงินและเวลา Live" />
          <div className="field-grid">
            <label>
              งบ AI ต่อเดือน (บาท)
              <input
                type="number"
                min={1}
                max={1000}
                value={profile.monthly_budget}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    monthly_budget: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Live ต่อวัน (นาที)
              <input
                type="number"
                min={1}
                max={60}
                value={profile.live_minutes}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    live_minutes: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <p className="fine-print">
            เก็บเสียงย้อนหลัง 30 วัน ประวัติและคำแนะนำยังอยู่ต่อเนื่อง
          </p>
          <button className="button primary" disabled={busy}>
            บันทึกการตั้งค่า <Check size={18} />
          </button>
          {saved && <span className="success">บันทึกแล้ว</span>}
        </form>
        <div className="settings-side">
          <div className="card spending-card">
            <span className="stat-icon green">
              <Wallet size={24} />
            </span>
            <span className="eyebrow">THIS MONTH</span>
            <h2>
              ฿{(usage?.spent || 0).toFixed(2)}
              <small> / ฿{usage?.budget || profile.monthly_budget}</small>
            </h2>
            <div className="progress-track">
              <span
                style={{
                  width: `${Math.min(100, ((usage?.spent || 0) / (usage?.budget || 600)) * 100)}%`,
                }}
              />
            </div>
            {usage?.warning && (
              <div className="notice">ใช้วงเงินเกิน 80% แล้ว</div>
            )}
            <div className="usage-rows">
              {Object.entries(usage?.by_role || {}).map(([role, cost]) => (
                <div key={role}>
                  <span>
                    {{
                      helper: "คำช่วยและถอดเสียง",
                      tutor: "ครูและ feedback",
                      tts: "เสียงตัวอย่าง",
                      live: "Live conversation",
                    }[role] || role}
                  </span>
                  <strong>฿{Number(cost).toFixed(2)}</strong>
                </div>
              ))}
            </div>
            <p className="fine-print">
              ประมาณการจาก usage ของแอป อาจต่างจากใบเรียกเก็บเงินจริง
              ไม่รวมค่าเครื่องและ hosting
            </p>
            {usage && !usage.ai_configured && (
              <div className="notice">
                ยังไม่ได้ตั้งค่า Gemini API key ที่ backend
              </div>
            )}
          </div>
          <div className="card account-card">
            <span className="eyebrow">ACCOUNT</span>
            <h3>{user.username}</h3>
            <p>
              {user.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้เรียน"} ·{" "}
              {user.profile.level}
            </p>
            <button className="button wide" onClick={onLogout}>
              <LogOut size={18} /> ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
      {user.role === "admin" && (
        <section className="card invitations-card">
          <SectionTitle
            title="ชวนเพื่อนเข้าพื้นที่ฝึก"
            label="ADMIN · INVITATIONS"
            action={
              <button
                className="button primary"
                onClick={async () => {
                  setError("");
                  try {
                    const r = await post<{ code: string }>(
                      "/admin/invitations",
                      {},
                    );
                    setCode(r.code);
                    await loadInvites();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <Plus size={18} /> สร้างรหัสเชิญ
              </button>
            }
          />
          <p>
            รหัสใช้ครั้งเดียว หมดอายุใน 7 วัน แสดงรหัสเต็มให้คัดลอกเฉพาะตอนสร้าง
          </p>
          {code && (
            <div className="invite-code">
              <code>{code}</code>
              <button
                className="icon-button"
                aria-label="คัดลอกรหัส"
                onClick={() => navigator.clipboard.writeText(code)}
              >
                <Copy size={18} />
              </button>
            </div>
          )}
          <div className="lesson-list">
            {invitations.map((i) => (
              <div className="lesson-row" key={i.id}>
                <Shield size={20} />
                <span className="lesson-row-copy">
                  <strong>คำเชิญ {i.id.slice(0, 8)}</strong>
                  <small>
                    หมดอายุ {new Date(i.expires_at).toLocaleDateString("th-TH")}
                  </small>
                </span>
                <span className="pill neutral">
                  {i.revoked
                    ? "ยกเลิกแล้ว"
                    : i.used
                      ? "ใช้แล้ว"
                      : new Date(i.expires_at) < new Date()
                        ? "หมดอายุ"
                        : "พร้อมใช้"}
                </span>
                {!i.used && !i.revoked && (
                  <button
                    className="icon-button"
                    aria-label="ยกเลิกรหัสเชิญ"
                    onClick={async () => {
                      try {
                        await api(`/admin/invitations/${i.id}`, {
                          method: "DELETE",
                        });
                        await loadInvites();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="card settings-form" style={{marginTop:24}}>
        <h2>เปลี่ยนรหัสผ่าน</h2>
        <form onSubmit={async(e)=>{e.preventDefault();const form=e.currentTarget;setBusy(true);setError("");try{await post("/auth/change-password",Object.fromEntries(new FormData(form)));form.reset();setPasswordChanged(true)}catch(err){setError((err as Error).message)}finally{setBusy(false)}}}>
          <label>รหัสผ่านปัจจุบัน<input type="password" name="current" autoComplete="current-password" required /></label>
          <label>รหัสผ่านใหม่<input type="password" name="password" autoComplete="new-password" required minLength={10} maxLength={256}/></label>
          <button className="button primary" disabled={busy}>บันทึกรหัสผ่านใหม่</button>
          {passwordChanged && <p className="success">เปลี่ยนรหัสผ่านแล้ว อุปกรณ์อื่นต้องเข้าสู่ระบบใหม่</p>}
        </form>
      </section>
    </>
  );
}
