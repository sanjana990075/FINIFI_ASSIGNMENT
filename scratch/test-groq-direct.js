import dotenv from 'dotenv';
import fs from 'fs/promises';
import pdfParse from 'pdf-parse';

dotenv.config();

const groqKey = process.env.GROQ_API_KEY;

async function testGroq() {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  
  const invPath = 'uploads/1781445808993-Invoice_1.pdf';
  const invBuffer = await fs.readFile(invPath);
  const invText = (await pdfParse(invBuffer)).text;

  const prompt = `
You are an expert data extraction assistant. Parse the following raw text from an Invoice document and return a JSON object.
Do not make up information. Extract exactly what is in the document.

The output JSON object MUST match the following JSON schema:
{
  "invoiceNumber": "string (The invoice number)",
  "poNumber": "string (The associated Purchase Order number)",
  "invoiceDate": "string (YYYY-MM-DD)",
  "items": [
    {
      "itemCode": "string (SKU)",
      "description": "string (Description)",
      "quantity": number
    }
  ]
}

Raw Text:
${invText.substring(0, 20000)}
`;

  const payload = {
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    model: 'llama-3.1-8b-instant',
    response_format: { type: 'json_object' },
  };

  try {
    console.log('Calling Groq API...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response content:', text);
  } catch (error) {
    console.error('Error:', error);
  }
}

testGroq();
