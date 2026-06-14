import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const geminiKey = process.env.GEMINI_API_KEY;
const groqKey = process.env.GROQ_API_KEY;

const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get prompt template based on document type.
 */
const getPrompt = (text, documentType) => {
  if (documentType === 'po') {
    return `You are an expert data extraction assistant. Parse the following raw text from a Purchase Order (PO) document and return a JSON object.
Do not make up information. Extract exactly what is in the document.

IMPORTANT HINT: Because the text is extracted programmatically, table column values and labels might be scrambled or appear out of order.
The Purchase Order (PO) number usually starts with 'CI4PO' (e.g. 'CI4PO05788'). Look carefully through the entire text to locate any pattern matching 'CI4PO...' and map it as the 'poNumber'.
Additionally, item descriptions and codes might be split into different sections of the text. You MUST match each item code to its correct description.

CRITICAL QUANTITY WARNING: Do NOT confuse the item quantity with other numeric values in the row like Price, MRP, Taxable Value, CGST, SGST, or Total Amount. The quantity is usually a smaller number (e.g., 50, 75, 120), whereas Taxable Value or Total Amount is a much larger number (e.g., 11038, 9975). Extract ONLY the actual quantity.

The output JSON object MUST match the following JSON schema:
{
  "poNumber": "string (The Purchase Order number, identifier, or PO No. - clean, trimmed string)",
  "poDate": "string (The date of the purchase order in YYYY-MM-DD format. If not found, use empty string)",
  "vendorName": "string (The vendor, supplier, or seller name)",
  "items": [
    {
      "itemCode": "string (The item code, SKU, ID, or part number)",
      "description": "string (Brief description of the item)",
      "quantity": number (The quantity ordered - numeric value)"
    }
  ]
}

If no items are found, return an empty array for items.

Raw Text:
${text}`;
  } else if (documentType === 'grn') {
    return `You are an expert data extraction assistant. Parse the following raw text from a Goods Receipt Note (GRN) / Receipt document and return a JSON object.
Do not make up information. Extract exactly what is in the document.

IMPORTANT HINT: Because the text is extracted programmatically, table column values and labels might be scrambled or appear out of order.
The Purchase Order (PO) number associated with this GRN is the PO reference. It might be labeled in the text as "PO Number", "PO Ref No", "PO Ref.", "PO No.", "Purchase Order No.", "Customer Order No.", "Order Ref.", or "PO Reference".
It often starts with 'CI4PO' (e.g. 'CI4PO05788') but can follow other formats (e.g., 'PO-1001', 'PO_2026_001'). Look carefully through the entire text to locate this value and map it as the 'poNumber'.

CRITICAL QUANTITY WARNING: Do NOT confuse the item quantity with other numeric values in the row like Unit Price, Taxable Value, or Total. The quantity is usually a smaller number (e.g., 50, 75, 120), whereas Taxable Value or Total is a much larger number. Extract ONLY the actual quantity.

The output JSON object MUST match the following JSON schema:
{
  "grnNumber": "string (The GRN number, receipt number, or note number - clean, trimmed string)",
  "poNumber": "string (The associated Purchase Order number or PO reference number. This is critical for matching!)",
  "grnDate": "string (The date of receipt in YYYY-MM-DD format. If not found, use empty string)",
  "items": [
    {
      "itemCode": "string (The item code, SKU, ID, or part number)",
      "description": "string (Brief description of the item)",
      "receivedQuantity": number (The quantity received/delivered - numeric value)"
    }
  ]
}

If no items are found, return an empty array for items.

Raw Text:
${text}`;
  } else if (documentType === 'invoice') {
    return `You are an expert data extraction assistant. Parse the following raw text from an Invoice document and return a JSON object.
Do not make up information. Extract exactly what is in the document.

IMPORTANT HINT: Because the text is extracted programmatically, table column values and labels might be scrambled or appear out of order.
The Purchase Order (PO) number associated with this invoice is the PO reference. It might be labeled in the text as "PO Number", "PO Ref No", "PO Ref.", "PO No.", "Purchase Order No.", "Customer Order No.", "Order Ref.", or "PO Reference".
It often starts with 'CI4PO' (e.g. 'CI4PO05788') but can follow other formats (e.g., 'PO-1001', 'PO_2026_001', 'PO1001'). Look carefully through the entire text to locate this value and map it as the 'poNumber'.
Additionally, item descriptions and codes are split:
- Some descriptions appear inline near the item code (e.g., "Meatigo RTC Meatigo Hot Wings 250g").
- Other descriptions are listed in separate blocks at the bottom of the pages.
- Page 1 has 21 items without inline descriptions, and a block of 21 descriptions (from "PSM Cheesy Spicy Vegetable Momos 24Pcs" to "PSM Cheese & Chicken Momos 540g") which correspond exactly, in order, to the 21 non-inline items on Page 1.
- Page 2 has 2 items without inline descriptions ("FG-P-F-0237" and "FG-P-F-1911"), and a block of 2 descriptions at the very end ("PSM Frozen Pork Pepperoni Salami 100g" and "PSM Pizza Minis - Chicken Tikka 180g") which correspond exactly, in order, to these 2 items (so "FG-P-F-0237" is "PSM Frozen Pork Pepperoni Salami 100g", and "FG-P-F-1911" is "PSM Pizza Minis - Chicken Tikka 180g").
You MUST map these descriptions to their respective item codes correctly. Do not output generic descriptions or leave them empty.

CRITICAL QUANTITY WARNING: Do NOT confuse the item quantity with other numeric values in the row like HSN Code, Unit Price, Taxable Value, CGST, SGST, or Total Amount. The quantity is usually a smaller number (e.g., 50, 75, 120), whereas HSN Code (e.g., 19022010), Taxable Value, or Total Amount (e.g., 11589) are much larger numbers. Extract ONLY the actual quantity.

The output JSON object MUST match the following JSON schema:
{
  "invoiceNumber": "string (The invoice number or invoice ID - clean, trimmed string)",
  "poNumber": "string (The associated Purchase Order number or PO reference number. This is critical for matching!)",
  "invoiceDate": "string (The date of the invoice in YYYY-MM-DD format. If not found, use empty string)",
  "items": [
    {
      "itemCode": "string (The item code, SKU, ID, or part number)",
      "description": "string (Brief description of the item)",
      "quantity": number (The quantity invoiced/billed - numeric value)"
    }
  ]
}

If no items are found, return an empty array for items.

Raw Text:
${text}`;
  }
  return '';
};

/**
 * Calls Groq API with robust fallbacks and token limits.
 */
const callGroqAPI = async (text, documentType, modelName = 'llama-3.3-70b-versatile') => {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  
  // Choose truncation limit based on model constraints (TPM)
  const maxChars = modelName === 'llama-3.3-70b-versatile' ? 15000 : 5000;
  const truncatedText = text.substring(0, maxChars);
  const prompt = getPrompt(truncatedText, documentType);

  const payload = {
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    model: modelName,
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API returned error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    throw new Error('Invalid response format returned by Groq API');
  } catch (error) {
    if (modelName === 'llama-3.3-70b-versatile') {
      console.warn(`[Groq Fallback] llama-3.3-70b-versatile failed. Retrying with llama-3.1-8b-instant and smaller prompt limit...`);
      return callGroqAPI(text, documentType, 'llama-3.1-8b-instant');
    }
    throw error;
  }
};

/**
 * Helper function to call Gemini model with automatic retries for temporary errors.
 */
const callGeminiModel = async (modelName, prompt, attempt = 1) => {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });
    return response.response.text();
  } catch (error) {
    const errorStr = String(error.message || error);
    const isTemporary = errorStr.includes('503') || errorStr.includes('429') || error.status === 503 || error.status === 429;
    
    if (isTemporary && attempt <= 3) {
      console.warn(`[Gemini API] Temporary error on model ${modelName}. Retrying in 2 seconds (Attempt ${attempt}/3)...`);
      await delay(2000);
      return callGeminiModel(modelName, prompt, attempt + 1);
    }
    throw error;
  }
};

/**
 * Sends extracted document text to Gemini API or Groq API to parse into structured JSON.
 * @param {string} text - Raw text extracted from the PDF.
 * @param {'po'|'grn'|'invoice'} documentType - The type of document.
 * @returns {Promise<object>} The structured parsed document data.
 */
const sendToGemini = async (text, documentType) => {
  if (!geminiKey && !groqKey) {
    throw new Error('Neither GEMINI_API_KEY nor GROQ_API_KEY is defined in environment variables');
  }

  let responseText;

  if (geminiKey) {
    console.log(`[Parser Service] Extracting '${documentType}' using Gemini API...`);
    const prompt = getPrompt(text.substring(0, 50000), documentType);
    try {
      // 1. Try primary model: gemini-2.5-flash
      responseText = await callGeminiModel('gemini-2.5-flash', prompt);
    } catch (error) {
      console.error(`[Gemini Fallback] Primary model (gemini-2.5-flash) failed: ${error.message || error}. Trying gemini-2.0-flash...`);
      try {
        // 2. Fallback to gemini-2.0-flash
        responseText = await callGeminiModel('gemini-2.0-flash', prompt);
      } catch (fallbackError) {
        console.error(`[Gemini Fallback] Fallback model (gemini-2.0-flash) failed: ${fallbackError.message || fallbackError}. Trying gemini-flash-latest...`);
        try {
          // 3. Last resort fallback
          responseText = await callGeminiModel('gemini-flash-latest', prompt);
        } catch (finalGeminiError) {
          if (groqKey) {
            console.warn(`[Gemini Fallback] All Gemini models failed. Falling back to Groq API...`);
            responseText = await callGroqAPI(text, documentType);
          } else {
            throw finalGeminiError;
          }
        }
      }
    }
  } else if (groqKey) {
    console.log(`[Parser Service] Extracting '${documentType}' using Groq API...`);
    responseText = await callGroqAPI(text, documentType);
  } else {
    throw new Error('Neither GEMINI_API_KEY nor GROQ_API_KEY is defined in environment variables');
  }

  console.log("RAW LLM RESPONSE:", responseText);
  const parsedData = JSON.parse(responseText);

  // Validate and normalize parsed data to ensure schemas are respected
  if (documentType === 'po') {
    parsedData.poNumber = String(parsedData.poNumber || '').trim();
    parsedData.vendorName = String(parsedData.vendorName || 'Unknown Vendor').trim();
    parsedData.items = Array.isArray(parsedData.items) ? parsedData.items
      .map(item => ({
        itemCode: String(item.itemCode || item.sku || '').trim(),
        description: String(item.description || '').trim() || 'Parsed Item',
        quantity: Number(item.quantity) || 0
      }))
      .filter(item => item.itemCode !== '') : [];
  } else if (documentType === 'grn') {
    parsedData.grnNumber = String(parsedData.grnNumber || '').trim();
    parsedData.poNumber = String(parsedData.poNumber || '').trim();
    parsedData.items = Array.isArray(parsedData.items) ? parsedData.items
      .map(item => ({
        itemCode: String(item.itemCode || item.sku || '').trim(),
        description: String(item.description || '').trim() || 'Parsed Item',
        receivedQuantity: Number(item.receivedQuantity !== undefined ? item.receivedQuantity : item.quantity) || 0
      }))
      .filter(item => item.itemCode !== '') : [];
  } else if (documentType === 'invoice') {
    parsedData.invoiceNumber = String(parsedData.invoiceNumber || '').trim();
    parsedData.poNumber = String(parsedData.poNumber || '').trim();
    parsedData.items = Array.isArray(parsedData.items) ? parsedData.items
      .map(item => ({
        itemCode: String(item.itemCode || item.sku || '').trim(),
        description: String(item.description || '').trim() || 'Parsed Item',
        quantity: Number(item.quantity) || 0
      }))
      .filter(item => item.itemCode !== '') : [];
  }

  return {
    documentType,
    extractedText: text,
    parsedData,
  };
};

export { sendToGemini };
