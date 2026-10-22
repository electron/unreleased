const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { timingSafeEqual } = require('../utils/helpers');

describe('timingSafeEqual', () => {
  it('returns true for matching strings', () => {
    assert.strictEqual(timingSafeEqual('secret', 'secret'), true);
  });

  it('returns false for mismatched strings', () => {
    assert.strictEqual(timingSafeEqual('secreT', 'secret'), false);
    assert.strictEqual(timingSafeEqual('short', 'secret'), false);
  });

  it('returns false instead of throwing when the header is missing', () => {
    assert.strictEqual(timingSafeEqual(undefined, 'secret'), false);
    assert.strictEqual(timingSafeEqual(null, 'secret'), false);
  });

  it('returns false when the secret is not configured', () => {
    assert.strictEqual(timingSafeEqual('secret', undefined), false);
    assert.strictEqual(timingSafeEqual(undefined, ''), false);
  });
});
