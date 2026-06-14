import dotenv from 'dotenv';

dotenv.config();

const groqKey = process.env.GROQ_API_KEY;

async function testGroq(model) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const payload = {
    messages: [
      {
        role: 'user',
        content: 'Respond with a simple JSON object: {"ping": "pong"}.',
      },
    ],
    model: model,
    response_format: { type: 'json_object' },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(`Model ${model} Status:`, response.status);
    const headers = {};
    for (const [key, val] of response.headers.entries()) {
      if (key.startsWith('x-ratelimit')) {
        headers[key] = val;
      }
    }
    console.log('Rate Limit Headers:', headers);
    const data = await response.json();
    console.log('Data:', data.choices?.[0]?.message?.content);
  } catch (err) {
    console.error(`Error for ${model}:`, err.message);
  }
}

async function main() {
  await testGroq('llama-3.3-70b-versatile');
  await testGroq('llama-3.1-8b-instant');
}

main();
