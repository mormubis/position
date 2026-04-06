import { describe, expect, it } from 'vitest';

import { squareToIndex } from '../board.js';

describe('squareToIndex', () => {
  it('e4 → 68', () => {
    expect(squareToIndex('e4')).toBe(68);
  });
  it('a1 → 112', () => {
    expect(squareToIndex('a1')).toBe(112);
  });
  it('h8 → 7', () => {
    expect(squareToIndex('h8')).toBe(7);
  });
});
