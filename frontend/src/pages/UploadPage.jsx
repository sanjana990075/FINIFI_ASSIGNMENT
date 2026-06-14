import { useState } from 'react';
import Loader from '../components/Loader.jsx';
import { getErrorMessage, uploadDocument } from '../services/api.js';

const documentTypes = [
  { value: 'po', label: 'Purchase Order (PO)' },
  { value: 'grn', label: 'GRN' },
  { value: 'invoice', label: 'Invoice' },
];

function UploadPage() {
  const [documentType, setDocumentType] = useState('po');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (event) => {
    setSuccessMessage('');
    setErrorMessage('');
    const selected = event.target.files[0];
    if (!selected) {
      setFile(null);
      return;
    }
    if (!['application/pdf', 'text/plain'].includes(selected.type) && !selected.name.endsWith('.pdf')) {
      setErrorMessage('Only PDF files are allowed.');
      setFile(null);
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setErrorMessage('File size must be under 10MB.');
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!file) {
      setErrorMessage('Please select a valid file before uploading.');
      return;
    }

    const formData = new FormData();
    formData.append('invoiceFile', file);
    formData.append('documentType', documentType);

    try {
      setLoading(true);
      await uploadDocument(formData);
      setSuccessMessage('Document uploaded successfully.');
      setFile(null);
      event.target.reset();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-grid page-upload">
      {loading && <Loader />}
      <section className="card page-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Document ingestion</p>
            <h1>Three-Way Match Engine</h1>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="documentType">
            Document Type
          </label>
          <select
            id="documentType"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
            className="input-field"
          >
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <label className="field-label" htmlFor="fileUpload">
            Choose file
          </label>
          <input
            id="fileUpload"
            type="file"
            accept=".pdf"
            className="input-field"
            onChange={handleFileChange}
          />

          {errorMessage && <div className="alert alert-error">{errorMessage}</div>}
          {successMessage && <div className="alert alert-success">{successMessage}</div>}

          <button type="submit" className="primary-button">
            Upload Document
          </button>
        </form>
      </section>
    </div>
  );
}

export default UploadPage;
