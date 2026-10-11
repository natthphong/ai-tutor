import type { EbookPack, EbookUnit } from "./EbookTypes";

/**
 * Builds a prompt the learner pastes into a voice-capable AI outside the app
 * (ChatGPT, Gemini, Claude) to keep practising this unit by speaking. The
 * prompt carries the unit's own content, so the outside tutor stays on what
 * was taught and at the unit's level.
 */
export function buildUnitPrompt(unit: EbookUnit, pack: EbookPack): string {
  const level = pack.level || "A1";
  const lines: string[] = [
    "You are my English speaking partner. I am a Thai adult learner and I want to practise SPEAKING, not reading.",
    "",
    `Lesson: ${unit.title}${pack.title_th ? ` (${pack.title_th})` : ""}`,
    `My level for this lesson: ${level} (CEFR). Keep your English at or below this level.`,
  ];
  if (pack.theme_th) lines.push(`Situation: ${pack.theme_th}`);
  if (pack.pattern) lines.push(`Target grammar pattern: ${pack.pattern}`);
  if (pack.explanation) lines.push(`What I learned (Thai): ${pack.explanation}`);
  if (pack.forms.length) {
    lines.push("", "Forms I studied:");
    for (const form of pack.forms) lines.push(`- ${form.label}: ${form.pattern} — e.g. ${form.sentence}`);
  }
  const examples = pack.examples.slice(0, 6);
  if (examples.length) {
    lines.push("", "Example sentences from the lesson:");
    for (const example of examples) lines.push(`- ${example.sentence}${example.meaning ? ` (${example.meaning})` : ""}`);
  }
  const words = pack.vocabulary.slice(0, 10);
  if (words.length) {
    lines.push("", "Vocabulary from the lesson (use these in your questions):");
    lines.push(words.map((word) => `${word.term}${word.meaning ? ` = ${word.meaning}` : ""}`).join("; "));
  }
  if (pack.common_mistakes.length) {
    lines.push("", "Mistakes I often make (correct me when I make them):");
    for (const mistake of pack.common_mistakes) lines.push(`- wrong: ${mistake.wrong} → right: ${mistake.right}`);
  }
  if (pack.speaking_prompt) lines.push("", `Start with this question: ${pack.speaking_prompt}`);
  lines.push(
    "",
    "How to run the practice:",
    "1. Ask ONE short question at a time and wait for my spoken answer. Each question must make me use the target grammar about my own life or work.",
    "2. After each answer: first react like a real person in one short sentence. If I made a mistake with the target grammar, show the corrected sentence, explain it in Thai in one short line, and ask me to say the corrected sentence again.",
    "3. Do not correct small things that are not about this lesson more than once.",
    "4. If I answer in Thai or get stuck, give me the first three words of a possible answer, not the whole sentence.",
    "5. Change the context every two or three questions (home, work, friends, yesterday, plans) so I reuse the pattern in new situations.",
    "6. After 10 questions, stop and give me a summary in Thai: what I said well, my 3 most important mistakes with the corrected sentences, and 3 sentences to practise tomorrow.",
    "",
    "Speak slowly and clearly. Begin now with the first question.",
  );
  return lines.join("\n");
}

/** Copies text; falls back to a hidden textarea where the Clipboard API is blocked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the selection-based copy.
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  area.remove();
  return copied;
}
