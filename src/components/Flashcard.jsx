import { useState } from 'react';

const LANG_CODES = {
  arabic: 'ar-SA',
  azerbaijani: 'az-AZ',
  en: 'en-US',
  es: 'es-ES'
};

export default function Flashcard({ phrase, nativeLang, learningLang }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Determine if we're learning Arabic/Azerbaijani or English/Spanish
  const isLearningArabicOrAz = learningLang === 'arabic' || learningLang === 'azerbaijani';

  // Front of card shows what we're learning, back shows native language
  let frontWord, frontTransliteration, backWord, backTransliteration;

  if (isLearningArabicOrAz) {
    // Learning Arabic/Azerbaijani from English/Spanish
    frontWord = phrase.word;
    frontTransliteration = phrase.transliteration;
    backWord = nativeLang === 'en' ? phrase.en : phrase.es;
    backTransliteration = null;
  } else {
    // Learning English/Spanish from Arabic/Azerbaijani
    frontWord = learningLang === 'en' ? phrase.en : phrase.es;
    frontTransliteration = null;
    backWord = phrase.word;
    backTransliteration = phrase.transliteration;
  }

  const speakWord = (e, text, lang) => {
    e.stopPropagation();

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANG_CODES[lang] || 'en-US';
      utterance.rate = 0.8;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="flashcard-container">
      <div
        className={`flashcard ${isFlipped ? 'flipped' : ''}`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="flashcard-front">
          <div className="card-content">
            <p className="word">{frontWord}</p>
            {frontTransliteration && (
              <p className="transliteration">{frontTransliteration}</p>
            )}
            <button
              className={`audio-btn ${isSpeaking ? 'speaking' : ''}`}
              onClick={(e) => speakWord(e, frontWord, learningLang)}
              aria-label="Listen to pronunciation"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </button>
            <p className="hint">Click card to flip, speaker to listen</p>
          </div>
        </div>
        <div className="flashcard-back">
          <div className="card-content">
            <p className="translation">{backWord}</p>
            {backTransliteration && (
              <p className="transliteration-small">{backTransliteration}</p>
            )}
            <button
              className={`audio-btn audio-btn-back ${isSpeaking ? 'speaking' : ''}`}
              onClick={(e) => speakWord(e, backWord, nativeLang)}
              aria-label="Listen to pronunciation"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
