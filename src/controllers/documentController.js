import mongoose from 'mongoose';
import GRN from '../models/grnModel.js';
import Invoice from '../models/invoiceModel.js';
import PurchaseOrder from '../models/purchaseOrderModel.js';
import { sendToGemini } from '../services/geminiService.js';
import { updateMatchResult } from '../services/matchService.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';

const parseDateSafe = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? new Date() : dateStr;
  
  let clean = String(dateStr).trim();
  
  // Handle DD/MM/YYYY or DD-MM-YYYY
  const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const match = clean.match(dmyRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed month
    const year = parseInt(match[3], 10);
    const parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  const parsed = new Date(clean);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

/**
 * Controller to upload, parse, and save a document.
 */
const uploadDocument = async (req, res, next) => {
  const { documentType } = req.body;
  const file = req.file;

  try {
    // 1. Error Handling: Missing file
    if (!file) {
      console.error('[UPLOAD] Error: No file provided');
      return res.status(400).json({ error: 'file_missing' });
    }

    // 2. Error Handling: Invalid documentType
    if (!['po', 'grn', 'invoice'].includes(documentType)) {
      console.error(`[UPLOAD] Error: Invalid documentType '${documentType}'`);
      return res.status(400).json({ error: 'invalid_document_type' });
    }

    console.log(`[UPLOAD] Received ${documentType.toUpperCase()} file upload: ${file.originalname}`);

    // 3. Error Handling: PDF extraction
    let extractedText;
    try {
      console.log(`[PDF_PARSE] Extracting text from ${file.originalname}`);
      extractedText = await extractTextFromPDF(file.path);
      if (!extractedText || extractedText.trim() === '') {
        throw new Error('PDF content is empty');
      }
    } catch (parseErr) {
      console.error(`[PDF_PARSE] Error extracting text: ${parseErr.message}`);
      return res.status(400).json({ error: 'empty_pdf_extraction' });
    }

    // 4. Error Handling: Gemini parsing
    let geminiResult;
    try {
      console.log(`[GEMINI] Calling API to parse ${documentType.toUpperCase()} text...`);
      geminiResult = await sendToGemini(extractedText, documentType);
      console.log(`[GEMINI] Extracted structured JSON successfully.`);
    } catch (geminiErr) {
      console.error(`[GEMINI] API Parsing failed: ${geminiErr.message}`);
      return res.status(500).json({ error: 'gemini_parsing_failure' });
    }

    const parsedData = geminiResult.parsedData;
    let poNumber = String(parsedData.poNumber || '').trim();

    // Resilient Fallback: If the LLM failed to extract the PO number, perform regex extraction on the raw text.
    if (!poNumber && extractedText) {
      console.log('[PARSER] PO Number was empty in LLM JSON. Running regex fallback extraction on raw text...');
      const ci4poMatch = extractedText.match(/\b(CI4PO\d+)\b/i);
      if (ci4poMatch) {
        poNumber = ci4poMatch[1].toUpperCase();
        console.log(`[PARSER] Regex fallback successfully recovered PO Number: ${poNumber} (CI4PO pattern)`);
      } else {
        // Look for PO Ref No, Customer Order No, etc.
        const poRefMatch = extractedText.match(/(?:po\s*ref\s*no|po\s*ref|po\s*number|po\s*no|customer\s*order\s*no|purchase\s*order)\s*[:.-]*\s*([a-z0-9\-_]+)/i);
        if (poRefMatch) {
          poNumber = poRefMatch[1].trim().toUpperCase();
          console.log(`[PARSER] Regex fallback successfully recovered PO Number: ${poNumber} (Label pattern)`);
        }
      }
      // Write the recovered poNumber back to parsedData so downstream database writes use it
      parsedData.poNumber = poNumber;
    }

    // 5. Error Handling: Missing poNumber
    if (!poNumber) {
      console.error('[UPLOAD] Error: Extracted poNumber is missing');
      return res.status(400).json({ error: 'missing_po_number' });
    }

    // 6. Duplicate PO Handling: Check if PO already exists
    if (documentType === 'po') {
      const existingPO = await PurchaseOrder.findOne({ poNumber: new RegExp(`^${poNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      if (existingPO) {
        console.warn(`[MONGO] Duplicate PO upload blocked for PO Number: ${poNumber}`);
        return res.status(400).json({ error: 'duplicate_po' });
      }
    }

    let savedDocument;

    console.log(`[MONGO] Persisting parsed ${documentType.toUpperCase()} document to database...`);
    
    // Save document to Mongoose/MongoDB
    if (documentType === 'po') {
      const { poDate, vendorName, items } = parsedData;
      savedDocument = await PurchaseOrder.create({
        poNumber,
        poDate: parseDateSafe(poDate),
        vendorName,
        items,
        rawGeminiResponse: geminiResult,
      });
    } else if (documentType === 'grn') {
      const { grnNumber, grnDate, items } = parsedData;
      
      // Ensure unique GRN check
      if (grnNumber) {
        const existingGRN = await GRN.findOne({ grnNumber: new RegExp(`^${grnNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        if (existingGRN) {
          console.warn(`[MONGO] Duplicate GRN upload blocked for GRN Number: ${grnNumber}`);
          return res.status(400).json({ error: 'duplicate_grn' });
        }
      }

      savedDocument = await GRN.create({
        grnNumber: grnNumber || `GRN-${Date.now()}`,
        poNumber,
        grnDate: parseDateSafe(grnDate),
        items,
        rawGeminiResponse: geminiResult,
      });
    } else {
      const { invoiceNumber, invoiceDate, items } = parsedData;

      // Ensure unique Invoice check
      if (invoiceNumber) {
        const existingInvoice = await Invoice.findOne({ invoiceNumber: new RegExp(`^${invoiceNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        if (existingInvoice) {
          console.warn(`[MONGO] Duplicate Invoice upload blocked for Invoice Number: ${invoiceNumber}`);
          return res.status(400).json({ error: 'duplicate_invoice' });
        }
      }

      savedDocument = await Invoice.create({
        invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
        poNumber,
        invoiceDate: parseDateSafe(invoiceDate),
        items,
        rawGeminiResponse: geminiResult,
      });
    }

    console.log(`[UPLOAD] ${documentType.toUpperCase()} uploaded successfully. ID: ${savedDocument._id}`);

    // Trigger three-way matching recalculation and update MatchResult collection
    try {
      await updateMatchResult(poNumber);
    } catch (matchError) {
      console.error(`[MATCH] Error recalculating PO ${poNumber}: ${matchError.message}`);
    }

    res.status(201).json(savedDocument);
  } catch (error) {
    console.error(`[MONGO] Database operation failed: ${error.message}`);
    if (error.code === 11000) {
      const errorMsg = documentType === 'po' ? 'duplicate_po' : 'duplicate_document';
      return res.status(400).json({ error: errorMsg });
    }
    next(error);
  }
};

/**
 * Controller to get a parsed document by ID.
 */
const getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'invalid_id' });
    }

    const [purchaseOrder, grn, invoice] = await Promise.all([
      PurchaseOrder.findById(id),
      GRN.findById(id),
      Invoice.findById(id),
    ]);

    const document = purchaseOrder || grn || invoice;

    if (!document) {
      return res.status(404).json({ error: 'document_not_found' });
    }

    res.json({
      id: document._id,
      type: purchaseOrder ? 'purchaseOrder' : grn ? 'grn' : 'invoice',
      poNumber: document.poNumber,
      parsedJson: document.rawGeminiResponse || {},
      document,
    });
  } catch (error) {
    next(error);
  }
};

export { getDocumentById, uploadDocument };
