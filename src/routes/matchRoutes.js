import express from 'express';
import { getMatchResult, matchRecords } from '../controllers/matchController.js';

const router = express.Router();

/**
 * @openapi
 * /match/{poNumber}:
 *   get:
 *     summary: Retrieve matching status for a purchase order.
 *     parameters:
 *       - in: path
 *         name: poNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: The purchase order number to match.
 *     responses:
 *       200:
 *         description: Match result retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MatchResultResponse'
 *       400:
 *         description: Invalid purchase order number.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Purchase order not found.
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
router.get('/:poNumber', getMatchResult);

router.post('/', matchRecords);

export default router;
