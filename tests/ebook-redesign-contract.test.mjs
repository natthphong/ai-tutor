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
