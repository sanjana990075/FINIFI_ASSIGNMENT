import GRN from '../models/grnModel.js';
import Invoice from '../models/invoiceModel.js';
import PurchaseOrder from '../models/purchaseOrderModel.js';
import MatchResult from '../models/matchResultModel.js';

/**
 * Normalizes an item description.
 * Rules: lowercase, remove punctuation, trim spaces.
 * @param {string} description - Raw item description.
 * @returns {string} Normalized item description.
 */
const normalizeDescription = (description) => {
  if (!description) return '';
  let clean = String(description).toLowerCase();
  
  // Remove punctuation (replace with spaces)
  clean = clean.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
  // Replace multiple spaces with single space and trim
  clean = clean.replace(/\s+/g, ' ').trim();
  
  return clean;
};

/**
 * Helper to calculate similarity between two descriptions based on token overlap.
 * Threshold is 0.6.
 * @param {string} desc1 - First description.
 * @param {string} desc2 - Second description.
 * @returns {number} Token overlap score.
 */
const calculateSimilarity = (desc1, desc2) => {
  const getSimilarityTokens = (desc) => {
    if (!desc) return [];
    let clean = String(desc).toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
    
    // Standardize synonyms
    clean = clean.replace(/\bveg\b/g, 'vegetable');
    clean = clean.replace(/\bpcs\b/g, 'pieces');
    clean = clean.replace(/\bpiece\b/g, 'pieces');
    clean = clean.replace(/\bkheema\b/g, 'keema');
    clean = clean.replace(/\bmomo\b/g, 'momos');
    clean = clean.replace(/\bminis\b/g, 'mini');
    clean = clean.replace(/\bkbab\b/g, 'kebab');
    clean = clean.replace(/\bkabab\b/g, 'kebab');
    clean = clean.replace(/\brolls\b/g, 'roll');
    clean = clean.replace(/\bcuts\b/g, 'cut');
    
    // Strip branding noise
    clean = clean.replace(/\bpsm\b/g, '');
    clean = clean.replace(/\bmeatigo\b/g, '');
    clean = clean.replace(/\brtc\b/g, '');
    clean = clean.replace(/\bfrozen\b/g, '');
    
    // Standardize numbers
    clean = clean.replace(/(\d+)\.0\b/g, '$1');
    clean = clean.replace(/(\d+)(g|kg|ml|ltr|pcs|pieces)\b/g, '$1 $2');
    
    return clean.split(/\s+/).filter(t => t.length > 0);
  };

  const tokens1 = getSimilarityTokens(desc1);
  const tokens2 = getSimilarityTokens(desc2);
  
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  // Guard: if one has a number and the other has a different number, they must not match
  const n1 = tokens1.find(t => /^\d+$/.test(t));
  const n2 = tokens2.find(t => /^\d+$/.test(t));
  if (n1 && n2 && n1 !== n2) {
    return 0;
  }

  // Guard: different category items must not match
  const productTypes = ['momo', 'momos', 'wing', 'wings', 'salami', 'sausage', 'sausages', 'kebab', 'kebabs', 'spring', 'bacon', 'ham', 'fillet', 'breast', 'curry', 'drumstick', 'kheema', 'keema'];
  const t1 = productTypes.filter(p => set1.has(p));
  const t2 = productTypes.filter(p => set2.has(p));
  if (t1.length > 0 && t2.length > 0) {
    const cat1 = t1[0].endsWith('s') ? t1[0].slice(0, -1) : t1[0];
    const cat2 = t2[0].endsWith('s') ? t2[0].slice(0, -1) : t2[0];
    const mapCat = (c) => (c === 'kheema' ? 'keema' : c);
    if (mapCat(cat1) !== mapCat(cat2)) {
      return 0;
    }
  }

  // Guard: different meat/veg types must not match
  const keys = ['chicken', 'pork', 'veg', 'vegetable', 'vegetables', 'fish', 'mutton', 'beef', 'paneer'];
  const s1Keys = keys.filter(k => set1.has(k));
  const s2Keys = keys.filter(k => set2.has(k));
  if (s1Keys.length > 0 && s2Keys.length > 0) {
    const mapKey = (k) => (k === 'vegetable' || k === 'vegetables' ? 'veg' : k);
    if (mapKey(s1Keys[0]) !== mapKey(s2Keys[0])) {
      return 0;
    }
  }

  // Overlap Coefficient = intersection / min(size1, size2)
  const intersection = tokens1.filter(t => set2.has(t));
  return intersection.length / Math.min(set1.size, set2.size);
};

/**
 * Deterministic matching strategy for descriptions.
 */
const areDescriptionsMatch = (desc1, desc2) => {
  return calculateSimilarity(desc1, desc2) >= 0.6;
};

const escapeRegExp = (string) => String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const poQuery = (poNumber) => ({ poNumber: new RegExp(`^${escapeRegExp(String(poNumber || '').trim())}$`, 'i') });

/**
 * Finds a matching PO item for a given GRN or Invoice item.
 * @param {object} item - The GRN or Invoice item.
 * @param {array} poItems - The array of PO items.
 * @returns {object|null} The matched PO item metadata or null.
 */
const findMatchingItem = (item, poItems) => {
  if (!item || !poItems || !Array.isArray(poItems)) return null;

  // Step 1: Try exact itemCode match
  const itemCode = String(item.itemCode || '').trim().toLowerCase();
  if (itemCode) {
    const exactMatch = poItems.find(
      (poItem) => String(poItem.itemCode || '').trim().toLowerCase() === itemCode
    );
    if (exactMatch) {
      return { poItem: exactMatch, matchedBy: 'itemCode', score: 1.0 };
    }
  }

  // Step 2: Try description similarity (picking best match)
  let bestMatch = null;
  let highestScore = 0;

  for (const poItem of poItems) {
    const score = calculateSimilarity(poItem.description, item.description);
    if (score >= 0.6 && score > highestScore) {
      highestScore = score;
      bestMatch = poItem;
    }
  }

  if (bestMatch) {
    return { poItem: bestMatch, matchedBy: 'description', score: highestScore };
  }

  return null;
};

/**
 * Reconciles PO, GRN, and Invoice documents for a given purchase order number.
 * @param {string} poNumber - The PO number.
 * @returns {Promise<object|null>} The match analysis results or null if PO not found.
 */
const matchPurchaseOrder = async (poNumber) => {
  const sanitizedPoNumber = String(poNumber || '').trim();
  if (!sanitizedPoNumber) {
    throw new Error('poNumber is required');
  }

  console.log(`[MATCH] Recalculating PO ${sanitizedPoNumber}`);

  const query = poQuery(sanitizedPoNumber);

  console.log(`[MONGO] Fetching documents for PO ${sanitizedPoNumber}`);
  const [purchaseOrders, grns, invoices] = await Promise.all([
    PurchaseOrder.find(query).lean(),
    GRN.find(query).lean(),
    Invoice.find(query).lean(),
  ]);

  const purchaseOrder = purchaseOrders[0] || null;

  // If the Purchase Order itself is not in the system, we return null so the controller returns 404
  if (!purchaseOrder) {
    return null;
  }

  const mismatchReasons = [];

  const documentCounts = {
    po: purchaseOrders.length,
    grn: grns.length,
    invoice: invoices.length,
  };

  // Duplicate PO logic
  if (purchaseOrders.length > 1) {
    mismatchReasons.push('duplicate_po');
  }

  // Date validation: Invoice date must not be after PO date (preserving user's custom business logic constraint).
  if (purchaseOrder.poDate) {
    const pDate = new Date(purchaseOrder.poDate);
    for (const invoice of invoices) {
      if (invoice.invoiceDate) {
        const iDate = new Date(invoice.invoiceDate);
        if (iDate > pDate) {
          mismatchReasons.push('invoice_date_after_po_date');
        }
      }
    }
  }

  // Map of itemCode -> match details to track quantities across all documents
  const itemMap = new Map();

  // Populate PO items first
  for (const item of purchaseOrder.items) {
    const code = String(item.itemCode || '').trim().toLowerCase();
    itemMap.set(code, {
      itemCode: item.itemCode,
      description: item.description,
      orderedQuantity: Number(item.quantity || 0),
      receivedQuantity: 0,
      invoicedQuantity: 0,
      isExtra: false,
    });
  }

  // Helper to find a map entry by description similarity if itemCode match fails
  const findEntryByDescription = (description) => {
    let bestCode = null;
    let highestScore = 0;
    for (const [code, data] of itemMap.entries()) {
      const score = calculateSimilarity(data.description, description);
      if (score >= 0.6 && score > highestScore) {
        highestScore = score;
        bestCode = code;
      }
    }
    return bestCode;
  };

  // Process GRN items
  for (const grn of grns) {
    for (const item of grn.items) {
      const code = String(item.itemCode || '').trim().toLowerCase();
      let mapKey = itemMap.has(code) ? code : null;
      if (!mapKey && item.description) {
        mapKey = findEntryByDescription(item.description);
      }

      if (mapKey) {
        const data = itemMap.get(mapKey);
        data.receivedQuantity += Number(item.receivedQuantity || 0);
      } else {
        // Extra item present in GRN but not PO
        mismatchReasons.push('item_missing_in_po');
        const uniqueKey = code || `extra-grn-${Date.now()}`;
        itemMap.set(uniqueKey, {
          itemCode: item.itemCode || 'UNKNOWN',
          description: item.description || 'Extra GRN Item',
          orderedQuantity: 0,
          receivedQuantity: Number(item.receivedQuantity || 0),
          invoicedQuantity: 0,
          isExtra: true,
        });
      }
    }
  }

  // Process Invoice items
  for (const invoice of invoices) {
    for (const item of invoice.items) {
      const code = String(item.itemCode || '').trim().toLowerCase();
      let mapKey = itemMap.has(code) ? code : null;
      if (!mapKey && item.description) {
        mapKey = findEntryByDescription(item.description);
      }

      if (mapKey) {
        const data = itemMap.get(mapKey);
        data.invoicedQuantity += Number(item.quantity || 0);
      } else {
        // Extra item present in Invoice but not PO
        mismatchReasons.push('item_missing_in_po');
        const uniqueKey = code || `extra-inv-${Date.now()}`;
        itemMap.set(uniqueKey, {
          itemCode: item.itemCode || 'UNKNOWN',
          description: item.description || 'Extra Invoice Item',
          orderedQuantity: 0,
          receivedQuantity: 0,
          invoicedQuantity: Number(item.quantity || 0),
          isExtra: true,
        });
      }
    }
  }

  // Evaluate matches & build itemMismatches array
  const itemMismatches = [];
  let matchedItemsCount = 0;

  for (const [key, data] of itemMap.entries()) {
    const isMatched = data.orderedQuantity === data.receivedQuantity && data.invoicedQuantity === data.orderedQuantity;

    if (isMatched) {
      matchedItemsCount++;
    } else {
      let reason = 'quantity_discrepancy';

      if (data.isExtra) {
        reason = 'missing_in_purchase_order';
      } else if (data.receivedQuantity > data.orderedQuantity) {
        reason = 'over_received';
        mismatchReasons.push('grn_qty_exceeds_po_qty');
      } else if (data.invoicedQuantity > data.orderedQuantity || data.invoicedQuantity > data.receivedQuantity) {
        reason = 'over_billed';
        if (data.invoicedQuantity > data.receivedQuantity) {
          mismatchReasons.push('invoice_qty_exceeds_grn_qty');
        }
        if (data.invoicedQuantity > data.orderedQuantity) {
          mismatchReasons.push('invoice_qty_exceeds_po_qty');
        }
      } else if (data.receivedQuantity < data.orderedQuantity || data.invoicedQuantity < data.orderedQuantity) {
        reason = 'partial_fulfillment';
      }

      itemMismatches.push({
        itemCode: data.itemCode,
        reason,
        details: {
          orderedQuantity: data.orderedQuantity,
          receivedQuantity: data.receivedQuantity,
          invoicedQuantity: data.invoicedQuantity,
        },
      });
    }
  }

  const uniqueReasons = [...new Set(mismatchReasons)];

  let status = 'matched';
  if (uniqueReasons.length > 0) {
    status = 'mismatch';
  } else if (grns.length === 0 || invoices.length === 0) {
    // If no discrepancies exist, but documents are missing, status is insufficient_documents
    status = 'insufficient_documents';
  } else if (itemMismatches.length > 0) {
    status = 'partially_matched';
  }

  return {
    poNumber: purchaseOrder.poNumber,
    status,
    mismatchReasons: uniqueReasons,
    documentCounts,
    summary: {
      totalItems: itemMap.size,
      matchedItems: matchedItemsCount,
      mismatchedItems: itemMap.size - matchedItemsCount,
    },
    itemMismatches,
    updatedAt: new Date(),
  };
};

/**
 * Recalculates and upserts MatchResult in DB.
 */
const updateMatchResult = async (poNumber) => {
  const sanitizedPoNumber = String(poNumber || '').trim();
  if (!sanitizedPoNumber) return null;

  const result = await matchPurchaseOrder(sanitizedPoNumber);
  if (!result) return null;

  const query = poQuery(sanitizedPoNumber);
  const [po, grns, invoices] = await Promise.all([
    PurchaseOrder.findOne(query),
    GRN.find(query),
    Invoice.find(query),
  ]);

  const matchData = {
    poNumber: sanitizedPoNumber,
    poId: po ? po._id : null,
    grnIds: grns.map((g) => g._id),
    invoiceIds: invoices.map((i) => i._id),
    status: result.status,
    mismatchReasons: result.mismatchReasons,
    documentCounts: result.documentCounts,
    summary: result.summary,
    itemMismatches: result.itemMismatches,
    updatedAt: result.updatedAt,
  };

  console.log(`[MONGO] Saving MatchResult for PO ${sanitizedPoNumber}`);
  return await MatchResult.findOneAndUpdate(
    { poNumber: new RegExp(`^${escapeRegExp(sanitizedPoNumber)}$`, 'i') },
    matchData,
    { upsert: true, new: true }
  ).lean();
};

export { matchPurchaseOrder, updateMatchResult, normalizeDescription, areDescriptionsMatch, findMatchingItem, calculateSimilarity };
