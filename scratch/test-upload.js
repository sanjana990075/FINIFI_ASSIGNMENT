import fs from 'fs';
import path from 'path';

async function testUpload() {
  try {
    const filePath = 'c:/Users/Hp/Desktop/Assignment/uploads/1781445808993-Invoice_1.pdf';
    console.log('Uploading file:', filePath);

    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      process.exit(1);
    }

    const buffer = fs.readFileSync(filePath);
    const form = new FormData();
    // In Express, multer expects the file field name to match what is configured.
    // Let's verify what field name multer uses. Let's check routes.
    form.append('file', new Blob([buffer], { type: 'application/pdf' }), 'Invoice_1.pdf');
    form.append('documentType', 'invoice');

    const res = await fetch('http://localhost:4000/api/documents/upload', {
      method: 'POST',
      body: form,
    });

    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Response JSON:', JSON.stringify(json, null, 2));
  } catch (error) {
    console.error('Upload request failed:', error);
  }
}

testUpload();
