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
    const { message, wrongAnswers, nativeLang, learningLang, conversationHistory } = await req.json();

    const langNames = {
      arabic: 'Arabic',
      azerbaijani: 'Azerbaijani',
      en: 'English',
      es: 'Spanish'
    };

    const learningLangName = langNames[learningLang] || learningLang;
    const nativeLangName = langNames[nativeLang] || nativeLang;

    const systemPrompt = `You are a friendly, patient language tutor helping someone learn ${learningLangName}. Their native language is ${nativeLangName}.

WORDS TO PRACTICE (they got these wrong on their quiz):
${wrongAnswers.map(w => `- "${w.word}" (${w.transliteration}) = "${w.translation}"`).join('\n')}

YOUR APPROACH:
- Start by greeting them in ${learningLangName} with the translation in parentheses
- Create mini-conversations that naturally use the words they struggled with
- When they try to use a word, gently correct any mistakes
- Give pronunciation tips using the transliteration
- Celebrate small wins with encouraging phrases
- Keep responses to 2-3 sentences max
- Mix ${learningLangName} words into your ${nativeLangName} responses gradually
- Ask them to try using one word at a time in a sentence

EXAMPLE INTERACTION:
User: "I want to practice"
You: "Marhaba! (Hello!) Let's start simple. Can you greet me back using the ${learningLangName} word for 'hello'?"

Be warm, encouraging, and make learning feel like a conversation with a friend, not a test.`;

    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
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
