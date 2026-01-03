import { useState, useRef, useEffect } from 'react';

export default function LanguageCoach({ context, allPhrases, nativeLang, learningLang, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Auto-start conversation based on context
    if (context?.type === 'hint') {
      sendMessage(`I need a hint for this word: "${context.phrase.word}" (${context.phrase.transliteration}). Don't tell me the answer directly, just give me a clue!`, true);
    } else {
      sendMessage("Hi! I want to practice my language skills. Can you help me learn?", true);
    }
  }, []);

  const getWordsForContext = () => {
    if (context?.type === 'hint' && context.phrase) {
      return [{
        word: context.phrase.word,
        transliteration: context.phrase.transliteration,
        translation: context.phrase.translation
      }];
    }
    // For general practice, use all phrases
    return allPhrases.map(p => ({
      word: p.word,
      transliteration: p.transliteration,
      translation: nativeLang === 'en' ? p.en : p.es
    }));
  };

  const sendMessage = async (text, isInitial = false) => {
    if (!text.trim() || isLoading) return;

    const userMessage = { role: 'user', content: text };

    if (!isInitial) {
      setMessages(prev => [...prev, userMessage]);
    }
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          wrongAnswers: getWordsForContext(),
          nativeLang,
          learningLang,
          conversationHistory: isInitial ? [] : messages,
          contextType: context?.type || 'general'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantMessage += parsed.text;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Please try again!'
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const contextLabel = context?.type === 'hint' ? 'Getting hint for:' : 'Practice words:';
  const wordsToShow = context?.type === 'hint'
    ? [context.phrase]
    : allPhrases.slice(0, 5);

  return (
    <div className="coach-container">
      <div className="coach-header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back
        </button>
        <h2>AI Language Coach</h2>
      </div>

      <div className="words-to-practice">
        <span className="practice-label">{contextLabel}</span>
        {wordsToShow.map((w, i) => (
          <span key={i} className="practice-word">{w.word}</span>
        ))}
        {context?.type !== 'hint' && allPhrases.length > 5 && (
          <span className="practice-word more">+{allPhrases.length - 5} more</span>
        )}
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="message assistant">
            <div className="message-content typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your response..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
