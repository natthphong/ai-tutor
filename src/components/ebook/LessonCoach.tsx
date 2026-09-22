import { Bookmark, Check, MessageCircle, Volume2 } from "lucide-react";
import { useState } from "react";
import type { User } from "@/lib/types";
import { VoiceButton } from "../ui";
import type { EbookPack, EbookProgress, EbookWord } from "./EbookTypes";
import { getProgressPercent } from "./EbookTypes";

export default function LessonCoach({
  pack,
  progress,
  user,
  onSaveWord,
}: {
  pack: EbookPack;
  progress: EbookProgress;
  user: User;
  onSaveWord: (word: EbookWord) => void;
}) {
  const saved = progress.vocabulary_saved || {};
  const percent = getProgressPercent(progress);
  const [showAllVocabulary, setShowAllVocabulary] = useState(false);
  return (
    <aside className="ebook-coach-column" aria-label="Loop Coach">
      <section className="card ebook-coach-card">
        <div className="ebook-coach-heading"><div><span className="eyebrow">YOUR PRACTICE BUDDY</span><h2>Loop Coach</h2></div><MessageCircle size={20} aria-hidden="true" /></div>
        <p>{pack.explanation}</p>
        <div className="ebook-goal-mini"><span className="eyebrow">GOAL</span><strong>{pack.goal}</strong></div>
        <div className="ebook-progress-summary">
          <div><strong>{percent}%</strong><span>unit progress</span></div>
          <div className="ebook-progress-track" role="progressbar" aria-label="Unit progress" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div>
        </div>
      </section>
      <section className={`card ebook-vocabulary-card ${showAllVocabulary ? "vocabulary-expanded" : ""}`} aria-labelledby="ebook-vocabulary-title">
        <div className="ebook-coach-heading"><div><span className="eyebrow">RECALL THESE</span><h2 id="ebook-vocabulary-title">Vocabulary</h2></div><span className="pill neutral">{pack.vocabulary.length}/10</span></div>
        <div className="ebook-vocabulary-list">
          {pack.vocabulary.slice(0, 10).map((word, index) => (
            <article className={`ebook-vocabulary-word ${index >= 3 ? "ebook-vocabulary-extra" : ""}`} data-testid="ebook-vocabulary-word" key={word.term}>
              <div className="ebook-word-copy"><strong>{word.term}</strong><span>{word.meaning}</span><small>{word.example}</small></div>
              <div className="ebook-word-actions">
                <VoiceButton text={word.example || word.term} voice={user.profile.voice} speed={user.profile.speed} label="Listen" />
                <button type="button" className={`icon-button ebook-save-word ${saved[word.term.toLocaleLowerCase()] ? "saved" : ""}`} aria-label={`Save ${word.term}`} onClick={() => onSaveWord(word)}><Bookmark size={16} fill={saved[word.term.toLocaleLowerCase()] ? "currentColor" : "none"} /></button>
              </div>
            </article>
          ))}
        </div>
        {pack.vocabulary.length > 3 && <button type="button" className="button small ebook-vocabulary-toggle" onClick={() => setShowAllVocabulary((current) => !current)}>{showAllVocabulary ? "Show fewer vocabulary" : `Show all ${pack.vocabulary.length} vocabulary`}</button>}
      </section>
      {pack.shadowing_sentences.length > 0 && (
        <section className="card ebook-shadow-source" aria-labelledby="ebook-shadow-source-title">
          <div className="ebook-coach-heading"><div><span className="eyebrow">LISTEN & SHADOW</span><h2 id="ebook-shadow-source-title">Source lines</h2></div><Volume2 size={19} aria-hidden="true" /></div>
          {pack.shadowing_sentences.map((line, index) => (
            <div className="ebook-shadow-line" key={`${line.sentence}-${index}`}>
              <strong>{line.sentence}</strong>
              {line.meaning && <span>{line.meaning}</span>}
              <small>Source: lesson example{line.source_page ? `, page ${line.source_page}` : ""}</small>
            </div>
          ))}
        </section>
      )}
      {(pack.useful_phrases.length > 0 || pack.speaking_prompt) && (
        <section className="card ebook-phrases-card">
          <div className="ebook-coach-heading"><div><span className="eyebrow">TAKE IT FURTHER</span><h2>{pack.useful_phrases.length > 0 ? "Useful phrases" : "Try it yourself"}</h2></div><Check size={18} aria-hidden="true" /></div>
          {pack.useful_phrases.length > 0 && <ul>{pack.useful_phrases.slice(0, 4).map((phrase) => <li key={phrase}>{phrase}</li>)}</ul>}
          {pack.speaking_prompt && <p>{pack.speaking_prompt}</p>}
        </section>
      )}
    </aside>
  );
}
