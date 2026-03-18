import { describe, expect, it } from 'vitest';

import { squareColor, squareFile, squareRank } from '../squares.js';

describe('squareFile', () => {
  it('returns the file letter', () => {
    expect(squareFile('e4')).toBe('e');
    expect(squareFile('a1')).toBe('a');
    expect(squareFile('h8')).toBe('h');
  });
});

describe('squareRank', () => {
  it('returns the rank digit', () => {
    expect(squareRank('e4')).toBe('4');
    expect(squareRank('a1')).toBe('1');
    expect(squareRank('h8')).toBe('8');
  });
});

describe('squareColor', () => {
  it('returns dark for dark squares', () => {
    expect(squareColor('a1')).toBe('dark');
    expect(squareColor('c1')).toBe('dark');
    expect(squareColor('b2')).toBe('dark');
  });

  it('returns light for light squares', () => {
    expect(squareColor('a2')).toBe('light');
    expect(squareColor('b1')).toBe('light');
    expect(squareColor('h1')).toBe('light');
  });

  // Ported from chess.js squareColor test suite
  it('returns light for known light squares', () => {
    expect(squareColor('a8')).toBe('light');
    expect(squareColor('h1')).toBe('light');
    expect(squareColor('e4')).toBe('light');
  });

  it('returns dark for known dark squares', () => {
    expect(squareColor('a1')).toBe('dark');
    expect(squareColor('h8')).toBe('dark');
    expect(squareColor('d4')).toBe('dark');
  });
});
