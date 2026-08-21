import assert from 'assert';
import { facilityMatch } from './facilityMatch.js';

assert.strictEqual(
  facilityMatch('[BRAC] Sylhet Relief Hub', '[BRAC] Sylhet Relief Hub [Hub]'),
  true,
  'restock dest should match logistics rep hub tag'
);
assert.strictEqual(
  facilityMatch('[BRAC] Sylhet Relief Hub [Hub]', '[BRAC] Sylhet Relief Hub'),
  true,
  'hub tag vs short warehouse name'
);
assert.strictEqual(
  facilityMatch('[BRAC] Sylhet Relief Hub', '[GOV] Sylhet Divisional Depot [Hub]'),
  false,
  'BRAC hub should not match GOV depot'
);
assert.strictEqual(
  facilityMatch('test 1 Abdur Rouf (Sylhet)', '[BRAC] Sylhet Relief Hub [Hub]'),
  false,
  'user shelter should not match BRAC hub'
);
assert.strictEqual(
  facilityMatch('', '[BRAC] Sylhet Relief Hub [Hub]'),
  false,
  'empty source'
);

console.log('facilityMatch tests passed');
