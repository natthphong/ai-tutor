"use client";
import { client } from "@/lib/client";
import { useEffect, useState, useCallback } from "react";
import {
  BookOpen,
  House,
  Mic,
  Library,
  ChartNoAxesCombined,
  Settings,
  Flame,
  ArrowRight,
  Check,
  Clock3,
  ChevronRight,
  Headphones,
  Plus,
  Search,
  Code2,
  Landmark,
  BriefcaseBusiness,
  MessagesSquare,
  UserRound,
  LogOut,
  Sparkles,
  RotateCcw,
  Target,
  Play,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";
import { api, post, awaitJob, ApiError } from "@/lib/api";
import type {
  User,
  Lesson,
  Scenario,
  Progress,
  DailyPlan,
  Usage,
  Word,
  ReviewItem,
} from "@/lib/types";
import Auth, { ChangePassword } from "./Auth";
import Practice from "./Practice";
import DailyMeet from "./DailyMeet";
import Review from "./Review";
import SettingsPage from "./Settings";
import {
  Mascot,
  Loading,
  ErrorMessage,
  Empty,
  SectionTitle,
  VoiceButton,
} from "./ui";
type View =
  | "today"
  | "curriculum"
  | "practice"
  | "library"
  | "progress"
  | "settings"
  | "review"
  | "daily-meet";
const nav = [
  { id: "today", label: "วันนี้", en: "Today", icon: House },
  { id: "curriculum", label: "หลักสูตร", en: "Learn", icon: BookOpen },
  { id: "practice", label: "ฝึกพูด", en: "Speak", icon: Mic },
  { id: "daily-meet", label: "Daily Meet", en: "My daily", icon: MessagesSquare },
  { id: "library", label: "คลังของฉัน", en: "My collection", icon: Library },
  {
    id: "progress",
    label: "ความก้าวหน้า",
    en: "Progress",
    icon: ChartNoAxesCombined,
  },
] as const;
const categories = [
  {
    name: "Everyday",
    description: "คุยให้คล่องในทุกวัน",
    color: "green",
    icon: MessagesSquare,
  },
  {
    name: "Tech",
    icon: Code2,
    color: "purple",
    description: "อธิบายไอเดียให้ทีมเข้าใจ",
  },
  {
    name: "Banking",
    icon: Landmark,
    color: "blue",
    description: "คุยงานธนาคารอย่างมั่นใจ",
  },
  {
    name: "Business",
    icon: BriefcaseBusiness,
    color: "orange",
    description: "เปลี่ยนความคิดเป็นข้อเสนอ",
  },
  {
    name: "Interview",
    icon: UserRound,
    color: "pink",
    description: "เล่าประสบการณ์ในแบบของคุณ",
  },
  {
    name: "Meeting",
    icon: MessagesSquare,
    color: "green",
    description: "มีส่วนร่วมในทุกบทสนทนา",
  },
];
export default function TutorApp() {
  const [user, setUser] = useState<User | null>();
  const [view, setView] = useState<View>("today");
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [version, setVersion] = useState(0);
  const [progress, setProgress] = useState<Progress>();
  const reload = useCallback(async () => {
    try {
      const result = await client.GET("/auth/me");
      if (result.error)
        throw new ApiError(result.error.error, result.response.status);
      setUser(result.data);
      setVersion((v) => v + 1);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setUser(null);
      else setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void reload();
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    const restore = () => {
      const q = new URLSearchParams(location.search);
      const v = q.get("view") as View;
      if (nav.some((n) => n.id === v) || ["settings", "review"].includes(v))
        setView(v);
      setSessionId(q.get("session") || "");
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [reload]);
  useEffect(() => {
    if (user && !user.must_change_password)
      api<Progress>("/progress")
        .then(setProgress)
        .catch(() => {});
  }, [user, version]);
  function go(v: View) {
    setView(v);
    setSessionId("");
    setMobileMenu(false);
    history.pushState({}, "", `/?view=${v}`);
  }
  async function start(mode: string, lesson?: string, scenario?: string) {
    setError("");
    try {
      const s = await post<{ id: string }>("/sessions", {
        mode,
        lesson_id: lesson || null,
        scenario_id: scenario || null,
      });
      openSession(s.id);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function openSession(id: string) {
    setSessionId(id);
    setView("practice");
    history.pushState({}, "", `/?view=practice&session=${id}`);
  }
  if (user === undefined)
    return (
      <>
        <Loading />
        <ErrorMessage message={error} />
        {error && (
          <button className="button" onClick={reload}>
            ลองเชื่อมต่อใหม่
          </button>
        )}
      </>
    );
  if (!user) return <Auth onLogin={reload} />;
  if (user.must_change_password)
    return <ChangePassword user={user} onDone={reload} />;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "is-open" : ""}`}>
        <button className="brand" onClick={() => go("today")}>
          <Mascot size={50} />
          <span>
            toko<span className="brand-loop">loop</span>
            <i />
          </span>
        </button>
        <span className="sidebar-label">YOUR DAILY PRACTICE</span>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              aria-label={n.label}
              className={`nav-link ${view === n.id ? "active" : ""}`}
              onClick={() => go(n.id)}
            >
              <n.icon size={21} />
              <span>
                {n.label}
                <small>{n.en}</small>
              </span>
              {view === n.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-coach">
            <Mascot size={80} />
            <strong>A little better, every day.</strong>
            <p>พูดวันละนิด เก่งขึ้นทุกวัน</p>
            <span className="pill">
              <Headphones size={13} /> Your practice buddy
            </span>
          </div>
          <button
            className={`nav-link ${view === "settings" ? "active" : ""}`}
            aria-label="ตั้งค่า"
            onClick={() => go("settings")}
          >
            <Settings size={20} />
            <span>ตั้งค่า</span>
          </button>
          <button
            className="user-button"
            aria-label="ตั้งค่า"
            onClick={() => go("settings")}
          >
            <span className="avatar">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{user.username}</strong>
              <small>{user.profile.level} · English learner</small>
            </span>
            <ChevronRight size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="เปิดเมนู"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>
          <div className="breadcrumb">
            My learning space <ChevronRight size={14} />
            <strong>
              {nav.find((n) => n.id === view)?.label ||
                (
                  { settings: "ตั้งค่า", review: "ทบทวน" } as Record<
                    string,
                    string
                  >
                )[view]}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="level-badge">
              <span />
              {user.profile.level}
            </span>
            <span className="streak">
              <Flame size={18} />
              {progress?.streak || 0}
              <span>day streak</span>
            </span>
            <button
              className="avatar small"
              aria-label="ตั้งค่า"
              onClick={() => go("settings")}
            >
              {user.username.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>
        <main className={sessionId ? "content practice-content" : "content"}>
          <ErrorMessage message={error} />
          {sessionId ? (
            <Practice
              key={sessionId}
              id={sessionId}
              onResume={openSession}
              user={user}
              onBack={() => {
                go("today");
                void reload();
              }}
            />
          ) : (
            <>
              {view === "today" && (
                <Today
                  user={user}
                  start={start}
                  go={go}
                  resume={openSession}
                  progress={progress}
                />
              )}
              {view === "curriculum" && (
                <Curriculum user={user} start={start} />
              )}
              {view === "practice" && (
                <PracticeHome user={user} start={start} resume={openSession} />
              )}
              {view === "daily-meet" && <DailyMeet user={user} resume={openSession} />}
              {view === "library" && <LibraryPage user={user} />}
              {view === "progress" && <ProgressPage progress={progress} />}{" "}
              {view === "settings" && (
                <SettingsPage
                  user={user}
                  onUpdate={reload}
                  onLogout={async () => {
                    await post("/auth/logout", {});
                    setUser(null);
                  }}
                />
              )}
              {view === "review" && (
                <Review
                  user={user}
                  onDone={() => {
                    go("today");
                    void reload();
                  }}
                />
              )}
            </>
          )}
        </main>
        <footer className="page-footer">
          <span>Made for your next conversation.</span>
          <span>
            Toko Loop <span className="tiny-dot" /> Learn. Speak. Repeat.
          </span>
        </footer>
      </div>
      <nav className="bottom-nav">
        {nav.map((n) => (
          <button
            key={n.id}
            aria-label={n.label}
            className={view === n.id ? "selected" : ""}
            onClick={() => go(n.id)}
          >
            <n.icon size={21} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
function Today({
  user,
  start,
  go,
  resume,
  progress,
}: {
  user: User;
  start: (m: string, l?: string, s?: string) => void;
  go: (v: View) => void;
  resume: (s: string) => void;
  progress?: Progress;
}) {
  const [data, setData] = useState<DailyPlan>();
  const [error, setError] = useState("");
  useEffect(() => {
    api<DailyPlan>("/daily-plan")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  if (!data)
    return (
      <>
        <Loading />
        <ErrorMessage message={error} />
      </>
    );
  const l = data.lesson;
  return (
    <>
      <div className="welcome-row">
        <div>
          <span className="eyebrow">A NEW DAY, A LITTLE MORE CONFIDENCE</span>
          <h1>
            สวัสดี, {user.username} <span className="wave">✦</span>
          </h1>
          <p>พร้อมเปลี่ยนความคิด ให้เป็นบทสนทนาแล้วหรือยัง?</p>
        </div>
        <span className="date-label">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </span>
      </div>
      {!user.profile.onboarded && (
        <div className="onboarding-strip">
          <Sparkles size={21} />
          <div>
            <strong>เริ่มในจังหวะที่ใช่สำหรับคุณ</strong>
            <span>
              เริ่มจากคำแรก หรือประเมินการพูดสั้น ๆ 5 ข้อเพื่อหาระดับเริ่มต้น
            </span>
          </div>
          <button className="text-button" onClick={() => start("placement")}>
            ประเมินระดับ <ArrowRight size={17} />
          </button>
          <button
            className="text-button"
            onClick={async () => {
              await api("/profile", {
                method: "PATCH",
                body: JSON.stringify({ onboarded: true }),
              });
              if (l) start("lesson", l.id);
            }}
          >
            เริ่มจากศูนย์
          </button>
        </div>
      )}
      <div className="today-grid">
        <section className="daily-hero">
          <div className="hero-copy">
            <span className="pill dark">
              <span className="live-dot" /> TODAY’S SPEAKING PLAN
            </span>
            <h2>
              One conversation
              <br />
              closer to <span>confident.</span>
            </h2>
            <p>
              วันละ {data.minutes} นาที จากประโยคสั้น ๆ<br />
              สู่การพูดได้ด้วยตัวเอง
            </p>
            <button
              className="button charcoal"
              onClick={() =>
                data.active_session_id
                  ? resume(data.active_session_id)
                  : l
                    ? start("lesson", l.id)
                    : go("practice")
              }
            >
              {data.active_session_id
                ? "ฝึกต่อจากครั้งที่แล้ว"
                : "เริ่มแผนวันนี้"}
              <ArrowRight size={19} />
            </button>
            <div className="hero-meta">
              <Clock3 size={15} />
              {data.minutes} นาที <span>·</span>
              <span>ปรับให้เหมาะกับคุณ</span>
            </div>
          </div>
          <div className="hero-mascot">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="floating-note note-one">
              You’ve got this! <Sparkles size={15} />
            </span>
            <Mascot size={250} />
            <span className="floating-note note-two">
              <Mic size={15} /> Let’s speak a little.
            </span>
          </div>
        </section>
        <aside className="goal-card card">
          <div className="card-top">
            <span className="eyebrow">DAILY GOAL</span>
            <Target size={19} />
          </div>
          <div
            className="goal-ring"
            style={
              {
                "--progress": `${Math.min(100, ((progress?.daily.find((d) => d.day.slice(0, 10) === new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }))?.minutes || 0) / data.minutes) * 100)}%`,
              } as React.CSSProperties
            }
          >
            <div>
              <strong>
                {progress?.daily.at(-1)?.day.slice(0, 10) ===
                new Date().toLocaleDateString("en-CA", {
                  timeZone: "Asia/Bangkok",
                })
                  ? progress.daily.at(-1)?.minutes
                  : 0}
                <span> / {data.minutes}</span>
              </strong>
              <small>นาทีที่ได้พูดวันนี้</small>
            </div>
          </div>
          <h3>ความสม่ำเสมอคือก้าวสำคัญ</h3>
          <div className="week-dots">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
              <span
                key={i}
                className={i === (new Date().getDay() + 6) % 7 ? "current" : ""}
              >
                {day}
                <i>{i === (new Date().getDay() + 6) % 7 ? <span /> : null}</i>
              </span>
            ))}
          </div>
        </aside>
      </div>
      <div className="quick-stats">
        <div>
          <span className="stat-icon purple">
            <Mic size={19} />
          </span>
          <span>
            <strong>
              {progress?.speaking_minutes || 0}
              <small> นาที</small>
            </strong>
            <label>เวลาฝึกพูดทั้งหมด</label>
          </span>
        </div>
        <div>
          <span className="stat-icon green">
            <BookOpen size={19} />
          </span>
          <span>
            <strong>
              {progress?.completed_lessons || 0}
              <small> / {progress?.total_lessons || "—"}</small>
            </strong>
            <label>บทเรียนที่เรียนจบแล้ว</label>
          </span>
        </div>
        <div>
          <span className="stat-icon orange">
            <RotateCcw size={19} />
          </span>
          <span>
            <strong>
              {data.due_count}
              <small> รายการ</small>
            </strong>
            <label>ถึงเวลาทบทวนแล้ว</label>
          </span>
          <button
            className="icon-button"
            aria-label="เริ่มทบทวน"
            onClick={() => go("review")}
          >
            <ArrowUpRight size={20} />
          </button>
        </div>
      </div>
      <SectionTitle
        label="YOUR NEXT SMALL WIN"
        title="ก้าวต่อไปของคุณ"
        action={
          <button className="text-button" onClick={() => go("curriculum")}>
            ดูหลักสูตรทั้งหมด <ArrowRight size={16} />
          </button>
        }
      />
      <div className="next-grid">
        {l && (
          <button
            className="next-lesson card"
            onClick={() => start("lesson", l.id)}
          >
            <div className="lesson-art purple">
              <MessagesSquare size={39} />
              <span>{l.ordinal.toString().padStart(2, "0")}</span>
            </div>
            <div className="lesson-description">
              <div className="inline-tags">
                <span className="pill purple">{l.level}</span>
                <span>
                  หน่วย {l.unit} · {l.unit_title}
                </span>
              </div>
              <h3>{l.title}</h3>
              <p>{l.pattern}</p>
              <div className="lesson-meta">
                <Headphones size={14} /> ฟัง · ฝึก · ลองพูด{" "}
                <span>10–15 นาที</span>
              </div>
            </div>
            <span className="round-arrow">
              <ArrowRight size={20} />
            </span>
          </button>
        )}
        <button className="review-prompt card" onClick={() => go("review")}>
          <span className="stat-icon orange">
            <RotateCcw size={25} />
          </span>
          <div>
            <h3>เปลี่ยน “เคยรู้” ให้เป็น “ใช้ได้”</h3>
            <p>
              {data.due_count
                ? `มี ${data.due_count} ประโยครอให้คุณลองอีกครั้ง`
                : "ฝึกแล้ว ระบบจะเลือกสิ่งที่ควรทบทวนให้คุณ"}
            </p>
            <span className="text-link">
              เปิดชุดทบทวน <ArrowRight size={15} />
            </span>
          </div>
        </button>
      </div>
      <SectionTitle
        label="REAL WORDS. REAL LIFE."
        title="อยากคุยเรื่องอะไรวันนี้?"
        action={
          <button className="text-button" onClick={() => go("practice")}>
            สำรวจสถานการณ์ <ArrowRight size={16} />
          </button>
        }
      />
      <div className="category-grid">
        {categories.map((cat) => (
          <button
            className="category-card"
            key={cat.name}
            onClick={() => go("practice")}
          >
            <span className={`category-icon ${cat.color}`}>
              <cat.icon size={25} />
            </span>
            <h3>{cat.name}</h3>
            <p>{cat.description}</p>
            <span>
              {cat.name === "Everyday" ? 20 : 10} สถานการณ์{" "}
              <ArrowUpRight size={15} />
            </span>
          </button>
        ))}
      </div>
      <div className="daily-quote">
        <span>“</span>
        <p>You don’t have to be perfect. You just have to keep talking.</p>
        <span>✦</span>
      </div>
    </>
  );
}
function Curriculum({
  user,
  start,
}: {
  user: User;
  start: (m: string, l?: string) => void;
}) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [level, setLevel] = useState(user.profile.level);
  const [selected, setSelected] = useState<Lesson>();
  const [error, setError] = useState("");
  useEffect(() => {
    api<Lesson[]>("/curriculum")
      .then(setLessons)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">A PATH THAT GROWS WITH YOU</span>
        <h1>จากคำแรก สู่บทสนทนาจริง</h1>
        <p>เรียน pattern ที่นำไปใช้ได้ ฝึกจนพูดออกมาเป็นธรรมชาติ</p>
      </div>
      <div className="level-tabs">
        {["Pre-A1", "A1", "A2", "B1", "B2"].map((l, i) => (
          <button
            key={l}
            className={level === l ? "active" : ""}
            onClick={() => setLevel(l)}
          >
            <span>{l}</span>
            <small>
              {
                [
                  "เริ่มจากศูนย์",
                  "พื้นฐานในชีวิตจริง",
                  "เริ่มคุยงาน",
                  "อธิบายและแลกเปลี่ยน",
                  "ประชุมอย่างมั่นใจ",
                ][i]
              }
            </small>
          </button>
        ))}
      </div>
      <ErrorMessage message={error} />
      {!lessons.length && !error && <Loading />}
      {[...new Set(lessons.filter((l) => l.level === level).map((l) => l.unit))]
        .sort((a, b) => a - b)
        .map((unit) => {
          const rows = lessons.filter(
            (l) => l.level === level && l.unit === unit,
          );
          return (
            <section className="unit-section" key={unit}>
              <SectionTitle
                label={`UNIT ${unit.toString().padStart(2, "0")}`}
                title={rows[0]?.unit_title || ""}
                action={
                  <span className="pill neutral">
                    เรียนแล้ว{" "}
                    {rows.filter((l) => l.studied || l.completed).length}/
                    {rows.length} บท
                  </span>
                }
              />
              <div className="lesson-list">
                {rows.map((l, i) => (
                  <button
                    className={`lesson-row ${l.studied || l.completed ? "complete" : ""}`}
                    key={l.id}
                    onClick={() => setSelected(l)}
                  >
                    <span className="lesson-number">
                      {l.studied || l.completed ? <Check size={20} /> : i + 1}
                    </span>
                    <span className="lesson-row-copy">
                      <strong>{l.title}</strong>
                      <small>{l.pattern}</small>
                    </span>
                    <span className="pill neutral">
                      {l.active_session_id
                        ? "กำลังเรียน · ฝึกต่อ"
                        : l.completed
                          ? "พูดได้เองแล้ว"
                          : l.studied
                            ? "เรียนแล้ว · ทบทวนได้"
                            : "ยังไม่ได้เรียน"}
                    </span>
                    <ChevronRight size={19} />
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(undefined)}>
          <div
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal icon-button"
              aria-label="ปิด"
              onClick={() => setSelected(undefined)}
            >
              <X />
            </button>
            <span className="pill purple">
              {selected.level} · หน่วย {selected.unit}
            </span>
            <h2>{selected.title}</h2>
            <p>{selected.objective}</p>
            <div className="pattern-example">
              <span className="eyebrow">YOUR SPEAKING PATTERN</span>
              <h3>{selected.pattern}</h3>
              <p>{selected.example}</p>
              <span>{selected.meaning}</span>
              <VoiceButton
                text={selected.example}
                voice={user.profile.voice}
                speed={user.profile.speed}
              />
            </div>
            <p>{selected.explanation}</p>
            {selected.grammar_focus && (
              <p className="pill purple">Grammar: {selected.grammar_focus}</p>
            )}
            {(selected.studied || selected.completed) && (
              <p>เคยเรียนบทนี้แล้ว กลับมาฝึกซ้ำได้โดยประวัติเดิมยังอยู่</p>
            )}
            <button
              className="button primary wide"
              onClick={() => start("lesson", selected.id)}
            >
              {selected.active_session_id
                ? "ฝึกต่อจากที่ค้างไว้"
                : selected.studied || selected.completed
                  ? "เรียนซ้ำอีกครั้ง"
                  : "เริ่มฝึกบทนี้"}{" "}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
function PracticeHome({
  user,
  start,
  resume,
}: {
  user: User;
  start: (m: string, l?: string, s?: string) => void;
  resume: (s: string) => void;
}) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Scenario>();
  const [history, setHistory] = useState<
    { id: string; mode: string; status: string; created_at: string }[]
  >([]);
  const [selected, setSelected] = useState<Scenario>();
  useEffect(() => {
    api<Scenario[]>("/scenarios")
      .then(setScenarios)
      .catch((e) => setError(e.message));
    api<typeof history>("/sessions")
      .then(setHistory)
      .catch(() => {});
  }, []);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const daily = await api<DailyPlan>("/daily-plan");
      const j = await post<{ job_id: string }>("/scenarios", {
        prompt,
        lesson_id: daily.lesson?.id,
        request_id: crypto.randomUUID(),
      });
      setDraft(await awaitJob<Scenario>(j.job_id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">SAY IT YOUR WAY</span>
        <h1>พื้นที่ลองพูดของคุณ</h1>
        <p>ไม่มีคำตอบที่ต้องสมบูรณ์แบบ มีแต่โอกาสได้ลองอีกครั้ง</p>
      </div>
      <div className="practice-options">
        <button className="practice-option yellow" onClick={()=>start("listening")}><Headphones size={29}/><h2>ฟังก่อน แล้วค่อยตอบ</h2><p>ฟัง 3 รอบ: ไม่มีคำพูด → เห็นบางคำ → เฉลย · เข้าใจแล้วตอบได้ทันที</p><span>เริ่ม Free speak with listening <ArrowRight size={18}/></span></button>
        <button
          className="practice-option yellow"
          onClick={() => start("free")}
        >
          <MessagesSquare size={29} />
          <h2>คุยเรื่องอะไรก็ได้</h2>
          <p>คิด พูด แล้วรับคำแนะนำทีละประโยค</p>
          <span>
            เริ่ม Free talk <ArrowRight size={18} />
          </span>
        </button>
        <button
          className="practice-option charcoal"
          onClick={() => start("live")}
        >
          <Headphones size={29} />
          <h2>Let’s talk, live.</h2>
          <p>บทสนทนาต่อเนื่อง พูดแทรกได้เหมือนคุยจริง</p>
          <span>
            เริ่ม Live conversation <ArrowRight size={18} />
          </span>
        </button>
      </div>
      <div className="custom-scenario card">
        <div>
          <span className="eyebrow">
            <Sparkles size={15} /> MADE FOR YOUR NEXT CONVERSATION
          </span>
          <h2>มีเรื่องที่อยากซ้อมเป็นพิเศษ?</h2>
          <p>เล่าว่าจะคุยกับใคร เรื่องอะไร Loop จะช่วยสร้างสถานการณ์ให้</p>
        </div>
        <div className="create-prompt">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="เช่น พรุ่งนี้ต้องอธิบาย API โอนเงินให้ BA และตอบคำถามเรื่องรายการซ้ำ"
            maxLength={2000}
          />
          <button
            className="button primary"
            disabled={busy || prompt.length < 5}
            onClick={create}
          >
            {busy ? "กำลังเตรียมสถานการณ์…" : "สร้างสถานการณ์ของฉัน"}
            <Plus size={18} />
          </button>
        </div>
        <ErrorMessage message={error} />
      </div>
      <SectionTitle
        title="ฝึกกับสถานการณ์จริง"
        label={`EXPLORE ${scenarios.length} SCENARIOS`}
      />
      <div className="filter-row">
        <div className="filter-chips">
          {["All", ...categories.map((c) => c.name), "Mine"].map((c) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              {c === "All" ? "ทั้งหมด" : c === "Mine" ? "ของฉัน" : c}
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={18} />
          <input
            aria-label="ค้นหาสถานการณ์"
            placeholder="ค้นหาสถานการณ์"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="scenarios-grid">
        {scenarios
          .filter(
            (s) =>
              (category === "All" ||
                (category === "Mine" && s.custom) ||
                s.category === category) &&
              `${s.title} ${s.goal}`
                .toLowerCase()
                .includes(search.toLowerCase()),
          )
          .map((s) => {
            const cat =
              categories.find((c) => c.name === s.category) || categories[0];
            return (
              <button
                className="scenario-card card"
                key={s.id}
                onClick={() => setSelected(s)}
              >
                <div className="card-top">
                  <span className={`stat-icon ${cat.color}`}>
                    <cat.icon size={23} />
                  </span>
                  <span className="pill neutral">{s.level}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.goal}</p>
                <div className="scenario-footer">
                  <span>{s.custom ? "สร้างโดยคุณ" : s.category}</span>
                  <span>
                    {s.minutes} นาที <ArrowRight size={15} />
                  </span>
                </div>
              </button>
            );
          })}
      </div>
      {history.length > 0 && (
        <section>
          <SectionTitle
            title="บทสนทนาของคุณ"
            label="PICK UP WHERE YOU LEFT OFF"
          />
          <div className="lesson-list">
            {history.slice(0, 6).map((s) => (
              <button
                className="lesson-row"
                key={s.id}
                onClick={() => resume(s.id)}
              >
                <MessagesSquare size={21} />
                <span className="lesson-row-copy">
                  <strong>
                    {s.mode === "lesson"
                      ? "ฝึกบทเรียน"
                      : s.mode === "placement"
                        ? "ประเมินระดับ"
                        : s.mode === "live"
                          ? "Live conversation"
                          : "Conversation"}
                  </strong>
                  <small>
                    {new Date(s.created_at).toLocaleString("th-TH")}
                  </small>
                </span>
                <span className="pill neutral">
                  {s.status === "active" ? "ฝึกต่อ" : "ดูสรุป"}
                </span>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </section>
      )}
      {(draft || selected) && (
        <div className="modal-backdrop">
          <div
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-label="รายละเอียดสถานการณ์"
          >
            <button
              className="close-modal icon-button"
              aria-label="ปิด"
              onClick={() => {
                setDraft(undefined);
                setSelected(undefined);
              }}
            >
              <X />
            </button>
            {draft ? (
              <>
                <span className="pill purple">สถานการณ์ของคุณ</span>
                <label>
                  ชื่อสถานการณ์
                  <input
                    value={draft.title}
                    onChange={(e) =>
                      setDraft({ ...draft, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  เป้าหมาย
                  <textarea
                    value={draft.goal}
                    onChange={(e) =>
                      setDraft({ ...draft, goal: e.target.value })
                    }
                  />
                </label>
                <label>
                  บริบท
                  <textarea
                    value={draft.brief}
                    onChange={(e) =>
                      setDraft({ ...draft, brief: e.target.value })
                    }
                  />
                </label>
                <p>{draft.roles.join(" · ")}</p>
                <button
                  className="button primary wide"
                  onClick={async () => {
                    try {
                      await api(`/scenarios/${draft.id}`, {
                        method: "PATCH",
                        body: JSON.stringify(draft),
                      });
                      setScenarios((s) => [...s, { ...draft, custom: true }]);
                      setSelected(draft);
                      setDraft(undefined);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  บันทึกสถานการณ์ <Check size={18} />
                </button>
              </>
            ) : (
              selected && (
                <>
                  <span className="pill purple">
                    {selected.category} · {selected.level}
                  </span>
                  <h2>{selected.title}</h2>
                  <p>{selected.brief}</p>
                  <div className="pattern-example">
                    <h3>เป้าหมายการฝึก</h3>
                    <p>{selected.goal}</p>
                    <ul>
                      {selected.success_criteria.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <p>บทบาท: {selected.roles.join(" · ")}</p>
                  <div className="button-row">
                    <button
                      className="button primary"
                      onClick={() => start("scenario", undefined, selected.id)}
                    >
                      พูดทีละเทิร์น <Mic size={18} />
                    </button>
                    <button
                      className="button charcoal"
                      onClick={() => start("live", undefined, selected.id)}
                    >
                      ฝึกแบบ Live <Headphones size={18} />
                    </button>
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}
function LibraryPage({ user }: { user: User }) {
  const [data, setData] = useState<{
    vocabulary: Word[];
    patterns: Lesson[];
    mistakes: ReviewItem[];
  }>();
  const [tab, setTab] = useState("vocabulary");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const load = () =>
    api<typeof data>("/library")
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">FROM KNOWING TO USING</span>
        <h1>คำที่ค่อย ๆ เป็นของคุณ</h1>
        <p>เก็บสิ่งที่อยากใช้ แล้วฝึกเรียกออกมาในบทสนทนา</p>
      </div>
      <div className="filter-row">
        <div className="filter-chips">
          {[
            ["vocabulary", "คำและวลี"],
            ["patterns", "Speaking patterns"],
            ["mistakes", "สิ่งที่กำลังพัฒนา"],
          ].map(([id, name]) => (
            <button
              className={tab === id ? "active" : ""}
              key={id}
              onClick={() => setTab(id)}
            >
              {name}
            </button>
          ))}
        </div>
        <button
          className="button small primary"
          onClick={() => setAdding(!adding)}
        >
          <Plus size={17} /> เพิ่มคำหรือวลี
        </button>
      </div>
      <ErrorMessage message={error} />
      {adding && (
        <form
          className="card word-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await post(
                "/vocabulary",
                Object.fromEntries(new FormData(e.currentTarget)),
              );
              setAdding(false);
              await load();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <label>
            คำหรือวลี
            <input name="term" required maxLength={120} />
          </label>
          <label>
            ความหมายไทย
            <input name="meaning" required maxLength={1000} />
          </label>
          <label>
            ตัวอย่าง
            <input name="example" required maxLength={1000} />
          </label>
          <button className="button primary">บันทึก</button>
        </form>
      )}
      {!data ? (
        <Loading />
      ) : tab === "vocabulary" ? (
        data.vocabulary.length ? (
          <div className="scenarios-grid">
            {data.vocabulary.map((w) => (
              <div className="card word-card" key={w.term}>
                <span
                  className={`pill ${(w.uses || 0) >= 2 ? "green" : "neutral"}`}
                >
                  {(w.uses || 0) >= 2 ? "เริ่มใช้ได้เอง" : "กำลังฝึกเรียกใช้"}
                </span>
                <h2>{w.term}</h2>
                <p>{w.meaning}</p>
                <blockquote>{w.example}</blockquote>
                <VoiceButton
                  text={w.example || w.term}
                  voice={user.profile.voice}
                  speed={user.profile.speed}
                />
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="เริ่มสะสมคำที่อยากใช้"
            detail="เพิ่มคำหรือวลีของคุณ หรือบันทึกจากบทเรียนได้เลย"
          />
        )
      ) : tab === "patterns" ? (
        data.patterns.length ? (
          <div className="scenarios-grid">
            {data.patterns.map((l) => (
              <div className="card word-card" key={l.id}>
                <span className="pill purple">{l.level}</span>
                <h3>{l.pattern}</h3>
                <p>{l.meaning}</p>
                <VoiceButton text={l.example} />
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Pattern แรกกำลังรอคุณ"
            detail="เริ่มฝึกบทเรียน แล้ว pattern ที่ใช้จะมาอยู่ตรงนี้"
          />
        )
      ) : data.mistakes.length ? (
        <div className="lesson-list">
          {data.mistakes.map((m) => (
            <div className="lesson-row" key={m.id}>
              <RotateCcw size={20} />
              <div className="lesson-row-copy">
                <strong>{m.title || "ทบทวนการสื่อสาร"}</strong>
                <small>{m.prompt}</small>
              </div>
              <span className="pill neutral">
                ทบทวน {new Date(m.due_at).toLocaleDateString("th-TH")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title="ทุกครั้งที่ลอง คือโอกาสเรียนรู้"
          detail="หลังฝึกพูด จุดที่ควรทบทวนจะถูกรวบรวมให้ตรงนี้"
        />
      )}
    </>
  );
}
function ProgressPage({ progress: p }: { progress?: Progress }) {
  if (!p) return <Loading />;
  const max = Math.max(5, ...p.daily.map((d) => d.minutes));
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">LOOK HOW FAR YOU’VE COME</span>
        <h1>ความมั่นใจ สร้างได้ทีละวัน</h1>
        <p>มองพัฒนาการจากการลงมือพูดจริงของคุณ</p>
      </div>
      <div className="metric-grid">
        {[
          [Mic, p.speaking_minutes, "นาทีที่ฝึกพูด"],
          [BookOpen, p.completed_lessons, "บทที่เรียนจบแล้ว"],
          [Flame, p.streak, "วันต่อเนื่อง"],
          [Sparkles, p.active_vocabulary, "คำที่ใช้เองได้"],
        ].map(([Icon, value, label], i) => {
          const I = Icon as typeof Mic;
          return (
            <div className="card metric" key={i}>
              <I size={22} />
              <strong>{String(value)}</strong>
              <span>{String(label)}</span>
            </div>
          );
        })}
      </div>
      <div className="progress-columns">
        <div className="card chart-card">
          <SectionTitle
            title="เวลาเล็ก ๆ ที่สะสมเป็นความก้าวหน้า"
            label="LAST 7 DAYS"
          />
          <div className="bar-chart">
            {p.daily.length ? (
              p.daily.map((d) => (
                <div className="bar-column" key={d.day}>
                  <span>{d.minutes}m</span>
                  <div
                    style={{
                      height: `${Math.max(5, (d.minutes / max) * 160)}px`,
                    }}
                  />
                  <small>
                    {new Date(d.day).toLocaleDateString("en", {
                      weekday: "short",
                    })}
                  </small>
                </div>
              ))
            ) : (
              <p>เริ่มอัดเสียงครั้งแรก แล้วกลับมาดูพัฒนาการของคุณ</p>
            )}
          </div>
        </div>
        <div className="card independence-card">
          <span className="eyebrow">YOUR OWN WORDS</span>
          <h2>{p.independent_successes}</h2>
          <p>
            ครั้งที่สื่อสารเป้าหมายได้ด้วยเสียง โดยไม่พึ่งคำใบ้หรืออ่านตาม retry
          </p>
          <div className="divider" />
          <span>คำตอบที่ใช้ความช่วยเหลือ</span>
          <strong>{p.hint_dependency}%</strong>
          <div className="progress-track">
            <span style={{ width: `${p.hint_dependency}%` }} />
          </div>
          <small>คำใบ้คือบันได ค่อย ๆ ลดลงเมื่อคุณพร้อม</small>
        </div>
      </div>
      <SectionTitle title="สิ่งที่เราจะฝึกไปด้วยกัน" label="YOUR NEXT FOCUS" />
      {p.weaknesses.length ? (
        <div className="lesson-list">
          {p.weaknesses.map((w, i) => (
            <div className="lesson-row" key={i}>
              <span className="stat-icon orange">
                <Target size={20} />
              </span>
              <div className="lesson-row-copy">
                <strong>{w.title || "ทบทวนการสื่อสาร"}</strong>
                <small>{w.prompt}</small>
              </div>
              <span className="pill neutral">พบ {w.failures} ครั้ง</span>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title="เริ่มต้นได้จากบทสนทนาเดียว"
          detail="Loop จะเลือกสิ่งที่ควรฝึกเพิ่มจากคำตอบจริงของคุณ"
        />
      )}
      <p className="fine-print">
        ระดับในแอปใช้จัดความยากของบทเรียน ไม่ใช่ผลสอบหรือใบรับรอง CEFR
      </p>
    </>
  );
}
