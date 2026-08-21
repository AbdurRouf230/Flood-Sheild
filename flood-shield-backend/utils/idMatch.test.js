const assert = require('assert');
const { recordMatchesId } = require('./idMatch');

const fakeObjectId = { toString() { return '6a87f597b52d8c626c3ba0b3'; } };
const shelter = {
  _id: fakeObjectId,
  id: '6a87f597b52d8c626c3ba0b3',
  name: 'test 1 Abdur Rouf'
};

assert.strictEqual(recordMatchesId(shelter, '6a87f597b52d8c626c3ba0b3'), true, 'string vs ObjectId');
assert.strictEqual(recordMatchesId(shelter, 'test 1 Abdur Rouf'), true, 'name fallback');
assert.strictEqual(recordMatchesId(shelter, 'missing'), false, 'no false positive');
assert.strictEqual(recordMatchesId(null, 'x'), false, 'null record');

console.log('idMatch tests passed');
