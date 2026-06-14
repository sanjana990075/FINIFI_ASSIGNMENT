import fs from 'fs';
import path from 'path';

async function uploadFile(filePath, docType) {
  const fileName = path.basename(filePath);
  const buffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('invoiceFile', new Blob([buffer], { type: 'application/pdf' }), fileName);
  form.append('documentType', docType);

  console.log(`Uploading ${docType}: ${fileName}...`);
  const res = await fetch('http://127.0.0.1:4000/api/documents/upload', {
    method: 'POST',
    body: form,
  });

  console.log(`Response Status: ${res.status}`);
  const json = await res.json();
  if (res.status !== 201) {
    console.error('Upload Error:', json);
  } else {
    console.log(`Success: ${json._id || json.id}`);
  }
}

async function main() {
  const poFile = './uploads/1781437328897-PO_1.pdf';
  const grnFile = './uploads/1781437346371-GRN_1.pdf';
  const invFile = './uploads/1781437564952-Invoice_1.pdf';

  try {
    await uploadFile(poFile, 'po');
    await uploadFile(grnFile, 'grn');
    await uploadFile(invFile, 'invoice');

    console.log('\nFetching Match Result for CI4PO05788...');
    const res = await fetch('http://127.0.0.1:4000/api/match/CI4PO05788');
    console.log(`Match Result Status: ${res.status}`);
    const json = await res.json();
    console.log('Result:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
