import fs from 'fs';
import path from 'path';

const uploadsDir = path.join(process.cwd(), 'uploads');
const fileName = '1781437328897-PO_1.pdf';
const filePath = path.join(uploadsDir, fileName);

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const buffer = fs.readFileSync(filePath);
const form = new FormData();
form.append('invoiceFile', new Blob([buffer], { type: 'application/pdf' }), fileName);
form.append('documentType', 'po');

const res = await fetch('http://127.0.0.1:4000/api/documents/upload', {
  method: 'POST',
  body: form,
});

console.log('status', res.status);
console.log(await res.json());
