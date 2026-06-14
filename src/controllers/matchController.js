import MatchResult from '../models/matchResultModel.js';
import { updateMatchResult } from '../services/matchService.js';

const escapeRegExp = (string) => String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /match/:poNumber
 * Retrieves the three-way match result for a purchase order.
 * Triggers a fresh evaluation on each request to ensure real-time correctness.
 */
const getMatchResult = async (req, res, next) => {
  try {
    const { poNumber } = req.params;
    const sanitizedPoNumber = String(poNumber || '').trim();
    if (!sanitizedPoNumber) {
      console.error('[MATCH] Error: poNumber is required in params');
      return res.status(400).json({ error: 'po_number_required' });
    }

    // Always trigger a fresh evaluation and upsert it in the database
    const matchResult = await updateMatchResult(sanitizedPoNumber);

    if (!matchResult) {
      return res.status(404).json({
        error: 'po_not_found',
        message: `Purchase Order '${sanitizedPoNumber}' was not found in the system.`,
      });
    }

    // Return format matching the recruiter-friendly response design
    res.json({
      poNumber: matchResult.poNumber,
      status: matchResult.status,
      mismatchReasons: matchResult.mismatchReasons || [],
      documentCounts: matchResult.documentCounts || {
        po: 0,
        grn: 0,
        invoice: 0,
      },
      summary: matchResult.summary || {
        totalItems: 0,
        matchedItems: 0,
        mismatchedItems: 0,
      },
      itemMismatches: matchResult.itemMismatches || [],
      updatedAt: matchResult.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /match
 * Force-recalculates and returns the latest match result for a poNumber.
 */
const matchRecords = async (req, res, next) => {
  try {
    const { poNumber } = req.body;
    if (!poNumber) {
      return res.status(400).json({ error: 'po_number_required' });
    }
    const result = await updateMatchResult(poNumber);
    if (!result) {
      return res.status(404).json({
        error: 'po_not_found',
        message: `Purchase Order '${poNumber}' was not found in the system.`,
      });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export { getMatchResult, matchRecords };
