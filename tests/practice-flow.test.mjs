import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { oldLessonSession, progressAudioSession } from "./fixtures/practice-sessions.mjs";

const practice = fs.readFileSync("src/components/Practice.tsx", "utf8");
const tutor = fs.readFileSync("src/components/TutorApp.tsx", "utf8");
const listening = fs.readFileSync("src/components/ListeningPractice.tsx", "utf8");
const dailyMeet = fs.readFileSync("src/components/DailyMeet.tsx", "utf8");

test("practice fixture keeps older sessions usable when progress and auto-audio are absent", () => {
  assert.equal(oldLessonSession.session.progress, undefined);
  assert.equal(oldLessonSession.session.state.auto_audio, undefined);
  assert.match(practice, /\{s\.progress && \(/);
  assert.match(practice, /checked=\{!!s\.state\.auto_audio\}/);
});

test("progress and auto-audio fixture maps all required lesson fields", () => {
  const { progress, state } = progressAudioSession.session;
  assert.equal(state.auto_audio, true);
  assert.deepEqual(Object.keys(progress).sort(), ["completed_drills", "independent_conversations", "percent", "ready_to_complete", "required_conversations", "total_drills"]);
  assert.match(practice, /s\.progress\.completed_drills/);
  assert.match(practice, /s\.progress\.independent_conversations/);
  assert.match(practice, /s\.progress\.ready_to_complete/);
  assert.match(practice, /`\/sessions\/\$\{id\}\/settings`/);
  assert.match(practice, /JSON\.stringify\(\{auto_audio: enabled\}\)/);
});

test("reply fixture supports stored Thai, on-demand translation, audio controls, and Safari fallback", () => {
  assert.equal(progressAudioSession.turns[0].text_th, "คุณทำอะไรที่นั่น");
  assert.equal(progressAudioSession.attempts[0].reply_audio_id, "audio-1");
  assert.match(practice, /turn\.text_th \|\| ""/);
  assert.match(practice, /\/turns\/\$\{turn\.id\}\/translate/);
  assert.match(practice, /<audio ref=\{replyPlayer\} controls/);
  assert.match(practice, /แตะปุ่มเล่นด้านล่างเพื่อฟังคำตอบ/);
});

test("unfinished lesson resume remains wired from shell to practice", () => {
  assert.match(tutor, /onResume=\{openSession\}/);
  assert.match(tutor, /active_session_id/);
  assert.match(practice, /onResume: \(id:string\) => void/);
});

test("listening UI keeps English hidden until the server supplies a caption", () => {
  assert.match(listening, /`\/sessions\/\$\{id\}\/listen`/);
  assert.match(listening, /question\?\.caption \?/);
  assert.match(listening, /ลองจับใจความจากเสียงก่อน ยังไม่แสดงคำพูดภาษาอังกฤษ/);
  assert.match(listening, /question\.translation&&/);
  assert.match(listening, /request_id:crypto\.randomUUID\(\)/);
  assert.match(listening, /พิมพ์ตอบได้ \(ไม่นับ speaking mastery\)/);
});

test("Daily Meet fixture flow persists jobs, edits owned text, and launches supported modes", () => {
  assert.match(dailyMeet, /localStorage\.setItem\(key,r\.job_id\)/);
  assert.match(dailyMeet, /awaitJob<DailyEntry>/);
  assert.match(dailyMeet, /method:"PATCH"/);
  assert.match(dailyMeet, /`\/daily-meets\/\$\{selected\.id\}\/sessions`/);
  for (const mode of ["free", "live", "listening"]) assert.ok(dailyMeet.includes(`practice("${mode}")`));
  assert.match(dailyMeet, /selected\.source/);
});
