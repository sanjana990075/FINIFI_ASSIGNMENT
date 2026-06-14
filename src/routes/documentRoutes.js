import express from 'express';
import { getDocumentById, uploadDocument } from '../controllers/documentController.js';
import { handleUploadError, normalizeUploadFile, uploadPdf } from '../middleware/uploadMiddleware.js';

const router = express.Router();

/**
 * @openapi
 * /documents/upload:
 *   post:
 *     summary: Upload a document PDF and parse it into a PO/GRN/Invoice record.
 *     description: Uploads a PDF document, parses it with external extraction, stores the parsed document, and returns the saved document record.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               documentType:
 *                 type: string
 *                 enum: [po, grn, invoice]
 *                 description: The type of document being uploaded.
 *               invoiceFile:
 *                 type: string
 *                 format: binary
 *                 description: The PDF file to upload. Use either `invoiceFile` or `file`.
 *     responses:
 *       201:
 *         description: Document uploaded and parsed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Invalid upload request.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/upload', uploadPdf, normalizeUploadFile, handleUploadError, uploadDocument);

/**
 * @openapi
 * /documents/{id}:
 *   get:
 *     summary: Get a parsed document by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The MongoDB document ID.
 *     responses:
 *       200:
 *         description: Parsed document retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentResponse'
 *       400:
 *         description: Invalid document id.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Document not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getDocumentById);

export default router;
