/**
 * Compare Mongo/in-memory record ids without ObjectId === string misses.
 */
const recordMatchesId = (record, target) => {
  const want = String(target || '').trim();
  if (!want || !record) return false;
  return [record._id, record.id, record.shelterId, record.campaignId, record.name]
    .some((value) => String(value || '').trim() === want);
};

module.exports = { recordMatchesId };
