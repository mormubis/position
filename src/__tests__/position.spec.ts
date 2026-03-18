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

describe('piece', () => {
  it('returns piece on occupied square', () => {
    const pos = new Position();
    expect(pos.piece('e1')).toEqual({ color: 'w', type: 'k' });
  });

  it('returns undefined for empty square', () => {
    const pos = new Position();
    expect(pos.piece('e4')).toBeUndefined();
  });
});

describe('pieces', () => {
  it('returns all 32 pieces when no color filter', () => {
    const pos = new Position();
    expect(pos.pieces().size).toBe(32);
  });

  it('returns 16 white pieces', () => {
    const pos = new Position();
    expect(pos.pieces('w').size).toBe(16);
  });

  it('returns 16 black pieces', () => {
    const pos = new Position();
    expect(pos.pieces('b').size).toBe(16);
  });
});

describe('findPiece', () => {
  it('returns squares with matching piece', () => {
    const pos = new Position();
    const squares = pos.findPiece({ color: 'w', type: 'r' });
    expect(squares).toHaveLength(2);
    expect(squares).toContain('a1');
    expect(squares).toContain('h1');
  });

  it('returns empty array when piece not found', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'k' }],
    ]);
    const pos = new Position(board);
    expect(pos.findPiece({ color: 'w', type: 'q' })).toEqual([]);
  });
});

describe('isAttacked', () => {
  it('returns true when a white pawn attacks the square diagonally', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['d3', { color: 'w', type: 'p' }],
    ]);
    const pos = new Position(board);
    expect(pos.isAttacked('e4', 'w')).toBe(true);
  });

  it('returns false when no piece attacks the square', () => {
    const board = new Map<Square, Piece>([['e1', { color: 'w', type: 'k' }]]);
    const pos = new Position(board);
    expect(pos.isAttacked('e4', 'b')).toBe(false);
  });

  it('returns true when a knight attacks the square', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['f6', { color: 'b', type: 'n' }],
    ]);
    const pos = new Position(board);
    expect(pos.isAttacked('e4', 'b')).toBe(true);
    expect(pos.isAttacked('g4', 'b')).toBe(true);
    expect(pos.isAttacked('a1', 'b')).toBe(false);
  });
});

describe('attackers', () => {
  it('returns squares of pieces attacking the target', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['f6', { color: 'b', type: 'n' }],
      ['f5', { color: 'b', type: 'b' }],
    ]);
    const pos = new Position(board);
    const atk = pos.attackers('e4', 'b');
    expect(atk).toContain('f6');
    expect(atk).toContain('f5');
  });

  it('returns empty array when no attackers', () => {
    const board = new Map<Square, Piece>([['e1', { color: 'w', type: 'k' }]]);
    const pos = new Position(board);
    expect(pos.attackers('e4', 'b')).toEqual([]);
  });
});

describe('isCheck', () => {
  it('returns false for starting position', () => {
    expect(new Position().isCheck).toBe(false);
  });

  it('returns true when king is attacked by a rook on same file', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'r' }],
    ]);
    const pos = new Position(board, { turn: 'w' });
    expect(pos.isCheck).toBe(true);
  });

  it('returns false when sliding attacker is blocked', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e4', { color: 'w', type: 'p' }],
      ['e8', { color: 'b', type: 'r' }],
    ]);
    const pos = new Position(board, { turn: 'w' });
    expect(pos.isCheck).toBe(false);
  });
});
