import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config({ path: 'c:/Users/Hp/Desktop/Assignment/.env' });

const geminiKey = process.env.GEMINI_API_KEY;
console.log('Gemini API Key:', geminiKey);

const genAI = new GoogleGenerativeAI(geminiKey);

async function testGemini() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    console.log('Calling gemini-2.5-flash...');
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Hello, respond with a JSON object containing {"status": "ok"}' }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });
    console.log('Response:', result.response.text());
  } catch (error) {
    console.error('Gemini error:', error);
  }
}

testGemini();
