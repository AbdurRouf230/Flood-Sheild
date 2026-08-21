/** Parse taka amounts: 1000000, "1000k", "1.5k" */
const parseTakaAmount = (input) => {
  if (input == null || input === '') return 0;
  const s = String(input).trim().replace(/,/g, '').toLowerCase();
  const kMatch = s.match(/^(\d+(?:\.\d+)?)\s*k$/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const digits = s.replace(/\D/g, '');
  const n = parseInt(digits, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Extract amount from free text e.g. "need money 1000k" */
const parseTakaFromText = (text) => {
  if (!text) return 0;
  const kMatch = String(text).match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  return 0;
};

const resolveRequestedFunding = (record) => {
  const direct = Number(record?.fundingAmount) || Number(record?.quantity) || 0;
  if (direct > 0) return direct;
  return parseTakaFromText(record?.details);
};

module.exports = { parseTakaAmount, parseTakaFromText, resolveRequestedFunding };
