import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const contractPath = [
  process.env.EBOOK_OPENAPI_PATH,
  path.resolve(process.cwd(), "../backend/contracts/openapi.json"),
  path.resolve(process.cwd(), "src/generated/openapi.json"),
].filter(Boolean).find((candidate) => fs.existsSync(candidate));
assert.ok(contractPath, "an OpenAPI contract is required (set EBOOK_OPENAPI_PATH or provide a sibling/generated contract)");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const schemas = contract.components.schemas;

test("Learn Ebook contract exposes the four learner states", () => {
  const progress = schemas.EbookProgress;
  assert.ok(progress, "EbookProgress must be a named schema, not an untyped object");
  assert.deepEqual(progress.properties.learning_state.enum, [
    "unlearned",
    "learning",
    "learned",
    "review",
  ]);
});

test("Learn Ebook contract fixes a lesson at five concept steps", () => {
  const steps = schemas.EbookPack.properties.concept_steps;
  assert.equal(steps.type, "array");
  assert.equal(steps.minItems, 5);
  assert.equal(steps.maxItems, 5);
  for (const field of ["id", "title", "status"]) {
    assert.ok(steps.items.required.includes(field), `concept step requires ${field}`);
  }
  assert.ok(!steps.items.required.includes("quiz"), "quiz is only present on the quiz step");
});

test("Learn Ebook contract provides exactly ten vocabulary entries and sourced shadowing", () => {
  const pack = schemas.EbookPack.properties;
  assert.equal(pack.vocabulary.minItems, 10);
  assert.equal(pack.vocabulary.maxItems, 10);
  assert.equal(pack.original_book.type, "object");
  assert.equal(pack.shadowing_sentences.type, "array");
  for (const field of ["lesson_example", "sentence", "meaning"]) {
    assert.ok(pack.shadowing_sentences.items.required.includes(field), `shadowing sentence requires ${field}`);
  }
  assert.ok(!pack.shadowing_sentences.items.required.includes("source_page"), "source_page is unavailable when no private book is connected");
});

test("Learn Ebook saves vocabulary context with the selected word", () => {
  const source = fs.readFileSync("src/components/LearnEbook.tsx", "utf8");
  assert.match(source, /post\("\/vocabulary", \{ term: word\.term, meaning: word\.meaning, example: word\.example \}\)/);
});

test("Learn Ebook course v2 contract teaches, tests and reviews each unit", () => {
  const pack = schemas.EbookPack.properties;
  for (const field of ["notes", "forms", "signal_words", "common_mistakes", "compare_th", "listening_items", "speaking_criteria", "level"]) {
    assert.ok(pack[field], `EbookPack exposes ${field}`);
  }
  assert.deepEqual(pack.level.enum, ["A1", "A2", "B1", "B2"]);
  assert.ok(pack.examples.maxItems >= 6, "a lesson may carry six examples");
  for (const kind of ["choice", "fill", "reorder", "fix", "translate", "write"]) {
    assert.ok(schemas.EbookQuestion.properties.kind.enum.includes(kind), `question kind ${kind}`);
    assert.ok(schemas.EbookQuizItem.properties.kind.enum.includes(kind), `quiz item kind ${kind}`);
  }
  assert.equal(schemas.EbookQuestion.properties.tokens.type, "array");
  const listening = pack.listening_items.items;
  assert.deepEqual(listening.required, ["id", "sentence", "question_th", "options"]);
  for (const hidden of ["answer_th", "meaning_th", "answer"]) {
    assert.ok(!listening.properties[hidden], `listening item must not expose ${hidden} before the learner answers`);
    assert.ok(!schemas.EbookListeningItem.properties[hidden], `lesson listening item must not expose ${hidden}`);
  }
  assert.equal(schemas.EbookCheckResult.properties.listening_done.type, "boolean");
});

test("Learn Ebook contract exposes the A1-first path and the daily plan block", () => {
  const unit = schemas.EbookUnitSummary.properties;
  assert.deepEqual(unit.level.enum, ["A1", "A2", "B1", "B2"]);
  assert.equal(unit.path_order.minimum, 1);
  assert.equal(schemas.EbookCatalog.properties.recommended_unit_id.type, "string");
  const plan = schemas.DailyPlan.properties.ebook;
  for (const field of ["total", "learned", "review_limit", "review_today", "levels"]) {
    assert.ok(plan.required.includes(field), `daily plan ebook block requires ${field}`);
  }
  assert.ok(plan.properties.next_unit.required.includes("level"));
});

test("Learn Ebook checks one question at a time and keeps unheard lines hidden", () => {
  const page = fs.readFileSync("src/components/LearnEbook.tsx", "utf8");
  assert.match(page, /checkAnswers\(\[question\.id\]\)/, "the quiz sends only the current question");
  assert.match(page, /checkAnswers\(\[item\.id\]\)/, "listening items are checked by the backend");
  assert.match(page, /isListeningDone\(detail\.pack, detail\.progress\)/, "shadowing waits for listening");
  const listening = fs.readFileSync("src/components/ebook/LessonShadowing.tsx", "utf8");
  assert.match(listening, /passed \? \(\s*<div className="ebook-listening-reveal"/, "the heard line is revealed only when the item is passed");
  const coach = fs.readFileSync("src/components/ebook/LessonCoach.tsx", "utf8");
  assert.match(coach, /!listenFirst \|\| isListeningDone\(pack, progress\)/, "the coach hides listening lines until they are answered");
});
