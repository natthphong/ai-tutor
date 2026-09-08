export const oldLessonSession = {
  session: { id: "old-session", mode: "lesson", status: "active", state: { stage: "drill", step: 1 } },
  lesson: { id: "lesson-001", drills: [{ kind: "shadowing", prompt: "Listen" }] },
  turns: [], attempts: [],
};

export const progressAudioSession = {
  session: {
    id: "progress-session", mode: "lesson", status: "active",
    state: { stage: "conversation", step: 1, auto_audio: true },
    progress: { percent: 83, completed_drills: 4, total_drills: 4, independent_conversations: 1, required_conversations: 2, ready_to_complete: false },
  },
  lesson: { id: "lesson-001", drills: [] },
  turns: [{ id: "reply-turn", role: "model", text: "What do you do there?", text_th: "คุณทำอะไรที่นั่น" }],
  attempts: [{ id: "attempt", reply_audio_id: "audio-1", reply_audio_error: "" }],
};
