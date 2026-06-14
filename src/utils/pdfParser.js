import fs from 'fs/promises';
import pdfParse from 'pdf-parse';

const extractTextFromPDF = async (filePath) => {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const parsed = await pdfParse(fileBuffer);

    if (!parsed || typeof parsed.text !== 'string') {
      throw new Error('PDF text extraction returned invalid data');
    }

    return parsed.text.trim();
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

export { extractTextFromPDF };
