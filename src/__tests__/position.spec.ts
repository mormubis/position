import { describe, expect, it } from 'vitest';

import { Position } from '../position.js';

import type { Piece, Square } from '../types.js';

describe('Position constructor', () => {
  it('defaults to starting position with no args', () => {
    const pos = new Position();
    expect(pos.turn).toBe('w');
    expect(pos.halfmoveClock).toBe(0);
    expect(pos.fullmoveNumber).toBe(1);
    expect(pos.castlingRights).toEqual({
      bK: true,
      bQ: true,
      wK: true,
      wQ: true,
    });
    expect(pos.enPassantSquare).toBeUndefined();
  });

  it('starting position has 32 pieces', () => {
    const pos = new Position();
    expect(pos.pieces().size).toBe(32);
  });

  it('accepts a custom board', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'k' }],
    ]);
    const pos = new Position(board);
    expect(pos.pieces().size).toBe(2);
    expect(pos.turn).toBe('w');
  });

  it('accepts options to override defaults', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'k' }],
    ]);
    const pos = new Position(board, {
      turn: 'b',
      halfmoveClock: 5,
      fullmoveNumber: 10,
      castlingRights: { bK: false, bQ: false, wK: false, wQ: false },
      enPassantSquare: 'e3',
    });
    expect(pos.turn).toBe('b');
    expect(pos.halfmoveClock).toBe(5);
    expect(pos.fullmoveNumber).toBe(10);
    expect(pos.castlingRights).toEqual({
      bK: false,
      bQ: false,
      wK: false,
      wQ: false,
    });
    expect(pos.enPassantSquare).toBe('e3');
  });
});
