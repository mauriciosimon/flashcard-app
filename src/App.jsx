import { useState, useEffect } from 'react';
import Flashcard from './components/Flashcard';
import Quiz from './components/Quiz';
import LanguageCoach from './components/LanguageCoach';
import { phrases } from './data/phrases';
import './App.css';

const ALL_LANGUAGES = [
  { id: 'arabic', label: 'Arabic' },
  { id: 'azerbaijani', label: 'Azerbaijani' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Spanish' }
];

function App() {
  const [nativeLang, setNativeLang] = useState('en');
  const [learningLang, setLearningLang] = useState('arabic');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState('flashcards');
  const [coachWrongAnswers, setCoachWrongAnswers] = useState([]);

  // Determine which phrase set to use based on languages
  const isLearningArabicOrAzerbaijani = learningLang === 'arabic' || learningLang === 'azerbaijani';
  const sourceLanguage = isLearningArabicOrAzerbaijani ? learningLang : nativeLang;

  const allCards = phrases[sourceLanguage] || [];

  // Reset when languages change
  useEffect(() => {
    setCurrentIndex(0);
    setMode('flashcards');
    setCoachWrongAnswers([]);
  }, [learningLang, nativeLang]);

  const handleNativeChange = (lang) => {
    if (lang === learningLang) return;
    setNativeLang(lang);
  };

  const handleLearningChange = (lang) => {
    if (lang === nativeLang) return;
    setLearningLang(lang);
  };

  const goToNext = () => {
    if (currentIndex < allCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleStartCoach = (wrongAnswers) => {
    setCoachWrongAnswers(wrongAnswers);
    setMode('coach');
  };

  const availableLearningLangs = ALL_LANGUAGES.filter(l => l.id !== nativeLang);
  const availableNativeLangs = ALL_LANGUAGES.filter(l => l.id !== learningLang);

  return (
    <div className="app">
      <header>
        <h1>Language Flashcards</h1>

        {mode !== 'coach' && (
          <>
            <div className="toggles">
              <div className="toggle-group">
                <label>I speak:</label>
                <div className="toggle-buttons">
                  {availableNativeLangs.map(lang => (
                    <button
                      key={lang.id}
                      className={nativeLang === lang.id ? 'active' : ''}
                      onClick={() => handleNativeChange(lang.id)}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="toggle-group">
                <label>I'm learning:</label>
                <div className="toggle-buttons">
                  {availableLearningLangs.map(lang => (
                    <button
                      key={lang.id}
                      className={learningLang === lang.id ? 'active' : ''}
                      onClick={() => handleLearningChange(lang.id)}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mode-toggle">
              <button
                className={mode === 'flashcards' ? 'active' : ''}
                onClick={() => setMode('flashcards')}
              >
                Flashcards
              </button>
              <button
                className={mode === 'quiz' ? 'active' : ''}
                onClick={() => setMode('quiz')}
              >
                Take Quiz
              </button>
            </div>
          </>
        )}
      </header>

      <main>
        {mode === 'coach' ? (
          <LanguageCoach
            wrongAnswers={coachWrongAnswers}
            nativeLang={nativeLang}
            learningLang={learningLang}
            onBack={() => setMode('quiz')}
          />
        ) : mode === 'quiz' ? (
          <Quiz
            key={`quiz-${learningLang}-${nativeLang}`}
            phrases={allCards}
            nativeLang={nativeLang}
            learningLang={learningLang}
            onExit={() => setMode('flashcards')}
            onStartCoach={handleStartCoach}
          />
        ) : (
          <>
            <div className="card-counter">
              {currentIndex + 1} / {allCards.length}
            </div>

            <Flashcard
              key={`${learningLang}-${nativeLang}-${currentIndex}`}
              phrase={allCards[currentIndex]}
              nativeLang={nativeLang}
              learningLang={learningLang}
            />

            <div className="navigation">
              <button onClick={goToPrev} disabled={currentIndex === 0}>
                Previous
              </button>
              <button onClick={goToNext} disabled={currentIndex === allCards.length - 1}>
                Next
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
