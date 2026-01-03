import { useState, useEffect } from 'react';

const LANG_CODES = {
  arabic: 'ar-SA',
  azerbaijani: 'az-AZ',
  en: 'en-US',
  es: 'es-ES'
};

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function Quiz({ phrases, nativeLang, learningLang, onExit, onStartCoach }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState([]);

  // Determine direction of learning
  const isLearningArabicOrAz = learningLang === 'arabic' || learningLang === 'azerbaijani';

  useEffect(() => {
    const shuffledPhrases = shuffleArray(phrases);
    const quizQuestions = shuffledPhrases.map((phrase) => {
      let questionText, questionTransliteration, correctAnswer, translation;

      if (isLearningArabicOrAz) {
        // Show Arabic/Azerbaijani word, answer in native language
        questionText = phrase.word;
        questionTransliteration = phrase.transliteration;
        correctAnswer = nativeLang === 'en' ? phrase.en : phrase.es;
        translation = correctAnswer;
      } else {
        // Show English/Spanish word, answer in Arabic/Azerbaijani
        questionText = learningLang === 'en' ? phrase.en : phrase.es;
        questionTransliteration = null;
        correctAnswer = phrase.word;
        translation = questionText;
      }

      // Get wrong answers
      const otherPhrases = phrases.filter(p => {
        if (isLearningArabicOrAz) {
          const answer = nativeLang === 'en' ? p.en : p.es;
          return answer !== correctAnswer;
        } else {
          return p.word !== correctAnswer;
        }
      });

      const shuffledOthers = shuffleArray(otherPhrases).slice(0, 3);
      const wrongOptions = shuffledOthers.map(p => {
        if (isLearningArabicOrAz) {
          return nativeLang === 'en' ? p.en : p.es;
        } else {
          return p.word;
        }
      });

      const allAnswers = shuffleArray([correctAnswer, ...wrongOptions]);

      return {
        phrase,
        questionText,
        questionTransliteration,
        correctAnswer,
        translation,
        options: allAnswers
      };
    });

    setQuestions(quizQuestions);
    setWrongAnswers([]);
  }, [phrases, nativeLang, learningLang, isLearningArabicOrAz]);

  const handleAnswer = (answer) => {
    if (isAnswered) return;

    setSelectedAnswer(answer);
    setIsAnswered(true);

    const currentQuestion = questions[currentIndex];
    if (answer === currentQuestion.correctAnswer) {
      setScore(score + 1);
    } else {
      // Track wrong answer
      setWrongAnswers(prev => [...prev, {
        word: currentQuestion.phrase.word,
        transliteration: currentQuestion.phrase.transliteration,
        translation: currentQuestion.translation
      }]);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsComplete(true);
    }
  };

  const getScoreMessage = (percentage) => {
    if (percentage === 100) return "Perfect! You're a master!";
    if (percentage >= 80) return "Excellent work!";
    if (percentage >= 60) return "Good job! Keep practicing!";
    if (percentage >= 40) return "Nice effort! Review the flashcards more.";
    return "Keep studying! You'll get there!";
  };

  const speakWord = (text, lang) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANG_CODES[lang] || 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Determine what language the question is in (for audio)
  const questionLang = isLearningArabicOrAz ? learningLang : learningLang;

  if (questions.length === 0) {
    return <div className="quiz-loading">Loading quiz...</div>;
  }

  if (isComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="quiz-complete">
        <div className="score-circle">
          <span className="score-number">{percentage}</span>
          <span className="score-label">out of 100</span>
        </div>
        <p className="score-detail">{score} of {questions.length} correct</p>
        <p className="score-message">{getScoreMessage(percentage)}</p>
        <div className="quiz-complete-actions">
          <button className="btn btn-secondary" onClick={onExit}>
            Back to Flashcards
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setQuestions(shuffleArray(questions));
              setCurrentIndex(0);
              setSelectedAnswer(null);
              setIsAnswered(false);
              setScore(0);
              setIsComplete(false);
              setWrongAnswers([]);
            }}
          >
            Retake Quiz
          </button>
        </div>
        {wrongAnswers.length > 0 && (
          <div className="coach-cta">
            <p className="coach-cta-text">
              Want to practice the {wrongAnswers.length} word{wrongAnswers.length > 1 ? 's' : ''} you missed?
            </p>
            <button
              className="btn btn-coach"
              onClick={() => onStartCoach(wrongAnswers)}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
              </svg>
              Practice with AI Coach
            </button>
          </div>
        )}
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="quiz">
      <div className="quiz-progress">
        <div className="quiz-progress-bar">
          <div
            className="quiz-progress-fill"
            style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
          />
        </div>
        <span className="quiz-progress-text">
          Question {currentIndex + 1} of {questions.length}
        </span>
      </div>

      <div className="quiz-question">
        <p className="quiz-word">{currentQuestion.questionText}</p>
        {currentQuestion.questionTransliteration && (
          <p className="quiz-transliteration">{currentQuestion.questionTransliteration}</p>
        )}
        <button
          className="audio-btn quiz-audio"
          onClick={() => speakWord(currentQuestion.questionText, questionLang)}
          aria-label="Listen to pronunciation"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        </button>
      </div>

      <div className="quiz-options">
        {currentQuestion.options.map((option, idx) => {
          let className = 'quiz-option';
          if (isAnswered) {
            if (option === currentQuestion.correctAnswer) {
              className += ' correct';
            } else if (option === selectedAnswer) {
              className += ' incorrect';
            }
          } else if (option === selectedAnswer) {
            className += ' selected';
          }

          return (
            <button
              key={idx}
              className={className}
              onClick={() => handleAnswer(option)}
              disabled={isAnswered}
            >
              <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
              {option}
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <div className="quiz-feedback">
          {selectedAnswer === currentQuestion.correctAnswer ? (
            <p className="feedback-correct">Correct!</p>
          ) : (
            <p className="feedback-incorrect">
              Incorrect. The answer is: {currentQuestion.correctAnswer}
            </p>
          )}
          <button className="btn btn-primary" onClick={handleNext}>
            {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
          </button>
        </div>
      )}
    </div>
  );
}
