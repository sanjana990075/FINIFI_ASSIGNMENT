import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Three-Way Match Engine API',
      version: '1.0.0',
      description: 'API for uploading and matching purchase order, GRN, and invoice documents.',
    },
    servers: [
      {
        url: 'http://localhost:4000',
      },
    ],
    components: {
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        DocumentResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '645b8123c2e5f3d712345678' },
            type: { type: 'string', example: 'purchaseOrder' },
            poNumber: { type: 'string', example: 'PO-12345' },
            parsedJson: { type: 'object' },
            document: { type: 'object' },
          },
        },
        MatchResultResponse: {
          type: 'object',
          properties: {
            poNumber: { type: 'string', example: 'CI4PO05788' },
            status: { type: 'string', example: 'matched' },
            mismatchReasons: { type: 'array', items: { type: 'string' } },
            documentCounts: {
              type: 'object',
              properties: {
                po: { type: 'number', example: 1 },
                grn: { type: 'number', example: 1 },
                invoice: { type: 'number', example: 1 }
              }
            },
            summary: {
              type: 'object',
              properties: {
                totalItems: { type: 'number', example: 40 },
                matchedItems: { type: 'number', example: 38 },
                mismatchedItems: { type: 'number', example: 2 }
              }
            },
            itemMismatches: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ItemMismatch'
              }
            },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-06-14T12:00:00.000Z' },
          },
        },
        ItemMismatch: {
          type: 'object',
          properties: {
            itemCode: { type: 'string', example: 'ITM-001' },
            reason: { type: 'string', example: 'over_billed' },
            details: {
              type: 'object',
              properties: {
                orderedQuantity: { type: 'number', example: 10 },
                receivedQuantity: { type: 'number', example: 10 },
                invoicedQuantity: { type: 'number', example: 12 }
              }
            }
          }
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
