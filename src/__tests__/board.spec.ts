import { describe, expect, it } from 'vitest';

import {
  BISHOP,
  BLACK,
  KING,
  KNIGHT,
  OFF_BOARD,
  PAWN,
  QUEEN,
  ROOK,
  WHITE,
  bitmaskToPiece,
  indexToSquare,
  pieceToBitmask,
  squareToIndex,
} from '../board.js';

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

describe('indexToSquare', () => {
  it('68 → e4', () => {
    expect(indexToSquare(68)).toBe('e4');
  });
  it('112 → a1', () => {
    expect(indexToSquare(112)).toBe('a1');
  });
  it('7 → h8', () => {
    expect(indexToSquare(7)).toBe('h8');
  });
});

describe('bitmask constants', () => {
  it('OFF_BOARD is 0x88', () => {
    expect(OFF_BOARD).toBe(0x88);
  });
  it('WHITE is 0', () => {
    expect(WHITE).toBe(0);
  });
  it('BLACK is 8', () => {
    expect(BLACK).toBe(8);
  });
  it('piece types are 1-6', () => {
    expect(PAWN).toBe(1);
    expect(KNIGHT).toBe(2);
    expect(BISHOP).toBe(3);
    expect(ROOK).toBe(4);
    expect(QUEEN).toBe(5);
    expect(KING).toBe(6);
  });
});

describe('pieceToBitmask', () => {
  it('white pawn → 1', () => {
    expect(pieceToBitmask({ color: 'white', type: 'pawn' })).toBe(WHITE | PAWN);
  });
  it('black knight → 10', () => {
    expect(pieceToBitmask({ color: 'black', type: 'knight' })).toBe(
      BLACK | KNIGHT,
    );
  });
  it('white king → 6', () => {
    expect(pieceToBitmask({ color: 'white', type: 'king' })).toBe(WHITE | KING);
  });
  it('black queen → 13', () => {
    expect(pieceToBitmask({ color: 'black', type: 'queen' })).toBe(
      BLACK | QUEEN,
    );
  });
});

describe('bitmaskToPiece', () => {
  it('1 → white pawn', () => {
    expect(bitmaskToPiece(WHITE | PAWN)).toEqual({
      color: 'white',
      type: 'pawn',
    });
  });
  it('10 → black knight', () => {
    expect(bitmaskToPiece(BLACK | KNIGHT)).toEqual({
      color: 'black',
      type: 'knight',
    });
  });
  it('6 → white king', () => {
    expect(bitmaskToPiece(WHITE | KING)).toEqual({
      color: 'white',
      type: 'king',
    });
  });
  it('13 → black queen', () => {
    expect(bitmaskToPiece(BLACK | QUEEN)).toEqual({
      color: 'black',
      type: 'queen',
    });
  });
  it('0 → undefined', () => {
    expect(bitmaskToPiece(0)).toBeUndefined();
  });
});
