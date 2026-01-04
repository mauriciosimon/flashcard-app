import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { message, wrongAnswers, nativeLang, learningLang, conversationHistory, contextType } = await req.json();

    const langNames = {
      arabic: 'Arabic',
      azerbaijani: 'Azerbaijani',
      en: 'English',
      es: 'Spanish'
    };

    const learningLangName = langNames[learningLang] || learningLang;
    const nativeLangName = langNames[nativeLang] || nativeLang;

    const audioInstructions = `
IMPORTANT - AUDIO FORMAT:
When you write a word in ${learningLangName}, wrap it with【】brackets so users can click to hear it.
Example: Instead of writing "ana" write 【أنا】 (for Arabic) or 【mən】 (for Azerbaijani)
This creates a clickable audio button. Always use the actual ${learningLangName} script inside the brackets.
For lists, format each word like: 【أنا】 (ana) - I, 【أنت】 (anta) - you, etc.`;

    let systemPrompt;

    if (contextType === 'hint') {
      systemPrompt = `You are a friendly language tutor helping someone learn ${learningLangName}. Their native language is ${nativeLangName}.

THE WORD THEY NEED A HINT FOR:
${wrongAnswers.map(w => `- "${w.word}" (${w.transliteration}) = "${w.translation}"`).join('\n')}

YOUR TASK:
- Give a helpful HINT without revealing the exact translation
- You can give clues like: the first letter, a rhyme, a related concept, or use it in context
- Be encouraging and playful
- Keep it to 1-2 sentences
- NEVER say the direct translation - they need to figure it out!
${audioInstructions}

EXAMPLE HINTS:
- "Think about what you say when you first see someone in the morning..."
- "This starts with the letter 'G' and you say it when meeting people!"`;
    } else {
      systemPrompt = `You are a friendly, patient language tutor helping someone learn ${learningLangName}. Their native language is ${nativeLangName}.

WORDS AVAILABLE TO TEACH:
${wrongAnswers.map(w => `- "${w.word}" (${w.transliteration}) = "${w.translation}"`).join('\n')}
${audioInstructions}

YOUR APPROACH:
- When greeting, use audio format: 【مرحبا】 (Marhaba) - Hello!
- When teaching vocabulary lists, format each word with audio: 【word】 (transliteration) - meaning
- Create mini-conversations using the audio words
- When they try to use a word, gently correct any mistakes
- Give pronunciation tips using the transliteration
- Celebrate small wins with encouraging phrases
- Keep responses to 2-3 sentences max unless they ask for a list
- If they ask for vocabulary (pronouns, numbers, etc), provide a formatted list with audio buttons

EXAMPLE RESPONSES:
User: "What are the Arabic pronouns?"
You: "Here are the basic Arabic pronouns:
【أنا】 (ana) - I
【أنت】 (anta) - you (male)
【أنتِ】 (anti) - you (female)
【هو】 (huwa) - he
【هي】 (hiya) - she
Click any word to hear it! Try using 【أنا】 in a sentence!"

User: "Hello!"
You: "【مرحبا】 (Marhaba)! Great to see you! Ready to practice some ${learningLangName} today?"

Be warm, encouraging, and make learning feel like a conversation with a friend.`;
    }

    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const chunk = event.delta.text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
