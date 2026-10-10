"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { post } from "@/lib/api";
import type { User } from "@/lib/types";

const CONFIRM_WORD = "delete";

type ResetResult = { reset: boolean; scope: "library" | "all"; deleted: Record<string, number> };

/** Local Ebook drafts would bring answers of a cleared lesson back. */
function clearEbookDrafts(userId: string) {
  if (typeof window === "undefined") return;
  const prefix = `toko-ebook:${userId}:`;
  for (const key of Object.keys(localStorage)) if (key.startsWith(prefix)) localStorage.removeItem(key);
}

export default function ResetLearning({ user, onDone }: { user: User; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [includeProgress, setIncludeProgress] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<ResetResult>();
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const confirmed = typed.trim().toLowerCase() === CONFIRM_WORD;

  function close() {
    if (busy) return;
    setOpen(false);
    setTyped("");
    setError("");
    setIncludeProgress(false);
    trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // close only reads state that is stable while the dialog is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy]);

  async function reset(event: React.FormEvent) {
    event.preventDefault();
    if (!confirmed || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await post<ResetResult>("/account/reset", { confirm: typed.trim(), scope: includeProgress ? "all" : "library" });
      if (result.scope === "all") clearEbookDrafts(user.id);
      setDone(result);
      setOpen(false);
      setTyped("");
      setIncludeProgress(false);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card settings-form reset-zone" style={{ marginTop: 24 }} aria-labelledby="reset-zone-title">
      <h2 id="reset-zone-title">เริ่มต้นใหม่</h2>
      <p>ล้างคลังของฉันและคิวทบทวนทั้งหมด เพื่อเริ่มเก็บข้อมูลการทบทวนใหม่ ลบแล้วกู้คืนไม่ได้</p>
      {done && (
        <p className="success" role="status">
          รีเซ็ตแล้ว: ลบคำศัพท์ {done.deleted.vocabulary ?? 0} คำ และรายการทบทวน {done.deleted.review_items ?? 0} รายการ
          {done.scope === "all" ? " พร้อมความคืบหน้าบทเรียนและประวัติการฝึก" : ""}
        </p>
      )}
      <button ref={trigger} type="button" className="button danger" onClick={() => { setDone(undefined); setOpen(true); }}>
        <Trash2 size={17} /> รีเซ็ตทั้งหมด
      </button>
      {open && (
        <div className="ebook-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <form className="card reset-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title" aria-describedby="reset-dialog-warning" onSubmit={reset}>
            <div className="ebook-dialog-header">
              <div><span className="eyebrow">CANNOT BE UNDONE</span><h2 id="reset-dialog-title">รีเซ็ตข้อมูลการเรียน</h2></div>
              <button type="button" className="icon-button" aria-label="Close reset dialog" onClick={close} disabled={busy}><X /></button>
            </div>
            <p id="reset-dialog-warning" className="reset-warning"><AlertTriangle size={18} aria-hidden="true" /><span>ข้อมูลด้านล่างจะถูกลบถาวรจากบัญชี <strong>{user.username}</strong> และกู้คืนไม่ได้</span></p>
            <div className="reset-lists">
              <div>
                <strong>จะถูกลบ</strong>
                <ul>
                  <li>คลังของฉัน: คำศัพท์ที่บันทึกและที่เรียนมาแล้วทั้งหมด</li>
                  <li>คิวทบทวนทั้งหมด รวมรายการที่ถึงกำหนดและที่นัดไว้ล่วงหน้า</li>
                  <li>รายการ “จุดที่เคยติดขัด” และประวัติการตอบทบทวน</li>
                  {includeProgress && <li>ความคืบหน้า Learn Ebook และหลักสูตร (กลับไปเริ่มบทแรก)</li>}
                  {includeProgress && <li>ประวัติการฝึกพูด บทสนทนา นาทีฝึกพูด และ streak</li>}
                </ul>
              </div>
              <div>
                <strong>จะยังอยู่</strong>
                <ul>
                  <li>บัญชี รหัสผ่าน และการตั้งค่า</li>
                  <li>ยอดใช้ AI ของเดือนนี้ (ยังนับในวงเงิน)</li>
                  <li>Daily Meet และสถานการณ์ที่สร้างเอง</li>
                  {!includeProgress && <li>ความคืบหน้าบทเรียน — บทที่เรียนจบแล้วจะไม่ถูกนัดทบทวนอีก</li>}
                </ul>
              </div>
            </div>
            <label className="toggle-label reset-scope">
              <span>ล้างความคืบหน้าบทเรียนและประวัติการฝึกด้วย<small>เลือกข้อนี้ถ้าต้องการเริ่มเรียนใหม่ตั้งแต่บทแรก</small></span>
              <input type="checkbox" checked={includeProgress} disabled={busy} onChange={(event) => setIncludeProgress(event.target.checked)} />
            </label>
            <label>
              <span>พิมพ์คำว่า <strong>delete</strong> เพื่อยืนยัน</span>
              <input ref={input} value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="delete" aria-label="Type delete to confirm" disabled={busy} />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="reset-actions">
              <button type="button" className="button" onClick={close} disabled={busy}>ยกเลิก</button>
              <button type="submit" className="button danger" disabled={!confirmed || busy}>{busy ? "กำลังรีเซ็ต…" : "ยืนยันรีเซ็ต"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
