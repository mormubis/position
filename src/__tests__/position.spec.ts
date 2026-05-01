import { describe, expect, it } from 'vitest';

import { STARTING_POSITION } from '../constants.js';
import { Position } from '../position.js';

import type { Piece, Square } from '../types.js';

describe('Position constructor', () => {
  it('defaults to empty board with no args', () => {
    const pos = new Position();
    expect(pos.turn).toBe('white');
    expect(pos.halfmoveClock).toBe(0);
    expect(pos.fullmoveNumber).toBe(1);
    expect(pos.pieces().size).toBe(0);
  });

  it('starting position has 32 pieces', () => {
    const pos = new Position({ board: STARTING_POSITION });
    expect(pos.pieces().size).toBe(32);
  });

  it('accepts a custom board', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
    ]);
    const pos = new Position({ board });
    expect(pos.pieces().size).toBe(2);
    expect(pos.turn).toBe('white');
  });

  it('accepts options to override defaults', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
    ]);
    const pos = new Position({
      board,
      turn: 'black',
      halfmoveClock: 5,
      fullmoveNumber: 10,
      castlingRights: {
        black: { king: false, queen: false },
        white: { king: false, queen: false },
      },
      enPassantSquare: 'e3',
    });
    expect(pos.turn).toBe('black');
    expect(pos.halfmoveClock).toBe(5);
    expect(pos.fullmoveNumber).toBe(10);
    expect(pos.castlingRights).toEqual({
      black: { king: false, queen: false },
      white: { king: false, queen: false },
    });
    expect(pos.enPassantSquare).toBe('e3');
  });
});

describe('piece', () => {
  it('returns piece on occupied square', () => {
    const pos = new Position({ board: STARTING_POSITION });
    expect(pos.at('e1')).toEqual({ color: 'white', type: 'king' });
  });

  it('returns undefined for empty square', () => {
    const pos = new Position({ board: STARTING_POSITION });
    expect(pos.at('e4')).toBeUndefined();
  });
});

describe('pieces', () => {
  it('returns all 32 pieces when no color filter', () => {
    const pos = new Position({ board: STARTING_POSITION });
    expect(pos.pieces().size).toBe(32);
  });

  it('returns 16 white pieces', () => {
    const pos = new Position({ board: STARTING_POSITION });
    expect(pos.pieces('white').size).toBe(16);
  });

  it('returns 16 black pieces', () => {
    const pos = new Position({ board: STARTING_POSITION });
    expect(pos.pieces('black').size).toBe(16);
  });
});

describe('isInsufficientMaterial', () => {
  it('returns false for starting position', () => {
    expect(
      new Position({ board: STARTING_POSITION }).isInsufficientMaterial,
    ).toBe(false);
  });

  it('returns true for K vs K', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
    ]);
    expect(new Position({ board }).isInsufficientMaterial).toBe(true);
  });

  it('returns true for K vs KB', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
      ['c1', { color: 'white', type: 'bishop' }],
    ]);
    expect(new Position({ board }).isInsufficientMaterial).toBe(true);
  });

  it('returns true for K vs KN', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
      ['c1', { color: 'black', type: 'knight' }],
    ]);
    expect(new Position({ board }).isInsufficientMaterial).toBe(true);
  });

  // Ported from chess.js
  it('returns false for K vs KP', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e2', { color: 'black', type: 'pawn' }],
      ['e3', { color: 'black', type: 'king' }],
    ]);
    expect(new Position({ board, turn: 'black' }).isInsufficientMaterial).toBe(
      false,
    );
  });

  it('returns false for K vs KR', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
      ['a1', { color: 'white', type: 'rook' }],
    ]);
    expect(new Position({ board }).isInsufficientMaterial).toBe(false);
  });

  // Ported from chess.js — same-color bishops cases
  it('returns true for KB vs KB with bishops on same color squares', () => {
    // 8/b7/3B4/8/8/8/8/k6K — white bishop on d6 (dark), black bishop on a7 (dark)
    const board = new Map<Square, Piece>([
      ['h1', { color: 'white', type: 'king' }],
      ['a1', { color: 'black', type: 'king' }],
      ['d6', { color: 'white', type: 'bishop' }],
      ['a7', { color: 'black', type: 'bishop' }],
    ]);
    expect(new Position({ board }).isInsufficientMaterial).toBe(true);
  });

  it('returns true for KB vs KB with many same-color bishops', () => {
    // 8/b1B1b1B1/1b1B1b1B/8/8/8/8/1k5K — all bishops on same color
    const board = new Map<Square, Piece>([
      ['h1', { color: 'white', type: 'king' }],
      ['b1', { color: 'black', type: 'king' }],
      ['a7', { color: 'black', type: 'bishop' }],
      ['c7', { color: 'white', type: 'bishop' }],
      ['e7', { color: 'black', type: 'bishop' }],
      ['g7', { color: 'white', type: 'bishop' }],
      ['b6', { color: 'black', type: 'bishop' }],
      ['d6', { color: 'white', type: 'bishop' }],
      ['f6', { color: 'black', type: 'bishop' }],
      ['h6', { color: 'white', type: 'bishop' }],
    ]);
    expect(new Position({ board }).isInsufficientMaterial).toBe(true);
  });

  it('returns false for KB vs KB with bishops on opposite color squares', () => {
    // 5k1K/7B/8/6b1/8/8/8/8 — white bishop on h7 (light), black bishop on g5 (dark)
    const board = new Map<Square, Piece>([
      ['h8', { color: 'white', type: 'king' }],
      ['f8', { color: 'black', type: 'king' }],
      ['h7', { color: 'white', type: 'bishop' }],
      ['g5', { color: 'black', type: 'bishop' }],
    ]);
    expect(new Position({ board }).isInsufficientMaterial).toBe(false);
  });

  it('returns false for KN vs KB', () => {
    const board = new Map<Square, Piece>([
      ['h8', { color: 'white', type: 'king' }],
      ['f8', { color: 'black', type: 'king' }],
      ['h7', { color: 'white', type: 'knight' }],
      ['g5', { color: 'black', type: 'bishop' }],
    ]);
    expect(new Position({ board }).isInsufficientMaterial).toBe(false);
  });

  it('returns false for KN vs KN', () => {
    const board = new Map<Square, Piece>([
      ['h8', { color: 'white', type: 'king' }],
      ['f8', { color: 'black', type: 'king' }],
      ['h7', { color: 'white', type: 'knight' }],
      ['e5', { color: 'black', type: 'knight' }],
    ]);
    expect(new Position({ board }).isInsufficientMaterial).toBe(false);
  });
});

describe('isValid', () => {
  it('returns true for starting position', () => {
    expect(new Position({ board: STARTING_POSITION }).isValid).toBe(true);
  });

  it('returns false when white king is missing', () => {
    const board = new Map<Square, Piece>([
      ['e8', { color: 'black', type: 'king' }],
    ]);
    expect(new Position({ board }).isValid).toBe(false);
  });

  it('returns false when black king is missing', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
    ]);
    expect(new Position({ board }).isValid).toBe(false);
  });

  it('returns false when a pawn is on rank 1', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
      ['a1', { color: 'white', type: 'pawn' }],
    ]);
    expect(new Position({ board }).isValid).toBe(false);
  });

  it('returns false when a pawn is on rank 8', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
      ['a8', { color: 'black', type: 'pawn' }],
    ]);
    expect(new Position({ board }).isValid).toBe(false);
  });

  it('returns false when the side not to move is in check', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
      ['e2', { color: 'white', type: 'rook' }],
    ]);
    // It is white's turn, but black king is in check from white rook — invalid
    const pos = new Position({ board, turn: 'white' });
    expect(pos.isValid).toBe(false);
  });
});

describe('isCheck', () => {
  it('returns false for starting position', () => {
    expect(new Position({ board: STARTING_POSITION }).isCheck).toBe(false);
  });

  it('returns true when king is attacked by a rook on same file', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'rook' }],
    ]);
    const pos = new Position({ board, turn: 'white' });
    expect(pos.isCheck).toBe(true);
  });

  it('returns false when sliding attacker is blocked', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e4', { color: 'white', type: 'pawn' }],
      ['e8', { color: 'black', type: 'rook' }],
    ]);
    const pos = new Position({ board, turn: 'white' });
    expect(pos.isCheck).toBe(false);
  });

  // Ported from chess.js isCheck test suite
  it('returns true when black is giving check via queen', () => {
    // rnb1kbnr/pppp1ppp/8/8/4Pp1q/2N5/PPPP2PP/R1BQKBNR w KQkq - 2 4
    const board = new Map<Square, Piece>([
      ['a8', { color: 'black', type: 'rook' }],
      ['b8', { color: 'black', type: 'knight' }],
      ['c8', { color: 'black', type: 'bishop' }],
      ['e8', { color: 'black', type: 'king' }],
      ['f8', { color: 'black', type: 'bishop' }],
      ['g8', { color: 'black', type: 'knight' }],
      ['h8', { color: 'black', type: 'rook' }],
      ['a7', { color: 'black', type: 'pawn' }],
      ['b7', { color: 'black', type: 'pawn' }],
      ['c7', { color: 'black', type: 'pawn' }],
      ['d7', { color: 'black', type: 'pawn' }],
      ['g7', { color: 'black', type: 'pawn' }],
      ['h7', { color: 'black', type: 'pawn' }],
      ['h4', { color: 'black', type: 'queen' }],
      ['f4', { color: 'black', type: 'pawn' }],
      ['e4', { color: 'white', type: 'pawn' }],
      ['c3', { color: 'white', type: 'knight' }],
      ['a2', { color: 'white', type: 'pawn' }],
      ['b2', { color: 'white', type: 'pawn' }],
      ['c2', { color: 'white', type: 'pawn' }],
      ['d2', { color: 'white', type: 'pawn' }],
      ['g2', { color: 'white', type: 'pawn' }],
      ['h2', { color: 'white', type: 'pawn' }],
      ['a1', { color: 'white', type: 'rook' }],
      ['c1', { color: 'white', type: 'bishop' }],
      ['d1', { color: 'white', type: 'queen' }],
      ['e1', { color: 'white', type: 'king' }],
    ]);
    const pos = new Position({ board, turn: 'white' });
    expect(pos.isCheck).toBe(true);
  });

  it('returns true for checkmate position (checkmate is also check)', () => {
    // R3k3/8/4K3/8/8/8/8/8 b - - 0 1 — black king checkmated by white rook
    const board = new Map<Square, Piece>([
      ['a8', { color: 'white', type: 'rook' }],
      ['e8', { color: 'black', type: 'king' }],
      ['e6', { color: 'white', type: 'king' }],
    ]);
    const pos = new Position({ board, turn: 'black' });
    expect(pos.isCheck).toBe(true);
  });

  it('returns false for stalemate position (stalemate is not check)', () => {
    // 4k3/4P3/4K3/8/8/8/8/8 b - - 0 1 — black king stalemated
    const board = new Map<Square, Piece>([
      ['e8', { color: 'black', type: 'king' }],
      ['e7', { color: 'white', type: 'pawn' }],
      ['e6', { color: 'white', type: 'king' }],
    ]);
    const pos = new Position({ board, turn: 'black' });
    expect(pos.isCheck).toBe(false);
  });
});

describe('hash', () => {
  it('returns a string', () => {
    expect(typeof new Position().hash).toBe('string');
  });

  it('returns the same hash for the same position', () => {
    expect(new Position().hash).toBe(new Position().hash);
  });

  it('returns different hashes for different positions', () => {
    const pos1 = new Position();
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
    ]);
    const pos2 = new Position({ board });
    expect(pos1.hash).not.toBe(pos2.hash);
  });

  it('returns different hashes for different turns', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
    ]);
    const posW = new Position({ board, turn: 'white' });
    const posB = new Position({ board, turn: 'black' });
    expect(posW.hash).not.toBe(posB.hash);
  });
});

describe('derive', () => {
  it('returns a clone when called with no arguments', () => {
    const pos = new Position({ board: STARTING_POSITION });
    const clone = pos.derive();
    expect(clone).not.toBe(pos);
    expect(clone.turn).toBe(pos.turn);
    expect(clone.halfmoveClock).toBe(pos.halfmoveClock);
    expect(clone.fullmoveNumber).toBe(pos.fullmoveNumber);
    expect(clone.castlingRights).toEqual(pos.castlingRights);
    expect(clone.enPassantSquare).toBe(pos.enPassantSquare);
    expect(clone.pieces()).toEqual(pos.pieces());
  });

  it('applies board changes', () => {
    const pos = new Position({ board: STARTING_POSITION });
    const derived = pos.derive({
      changes: [
        ['e2', undefined],
        ['e4', { color: 'white', type: 'pawn' }],
      ],
    });
    expect(derived.at('e2')).toBeUndefined();
    expect(derived.at('e4')).toEqual({ color: 'white', type: 'pawn' });
  });

  it('does not modify the original position', () => {
    const pos = new Position({ board: STARTING_POSITION });
    pos.derive({
      changes: [['e2', undefined]],
    });
    expect(pos.at('e2')).toEqual({ color: 'white', type: 'pawn' });
  });

  it('overrides turn', () => {
    const pos = new Position({ board: STARTING_POSITION });
    const derived = pos.derive({ turn: 'black' });
    expect(derived.turn).toBe('black');
    expect(pos.turn).toBe('white');
  });

  it('overrides castling rights', () => {
    const pos = new Position({ board: STARTING_POSITION });
    const rights = {
      black: { king: false, queen: false },
      white: { king: false, queen: false },
    };
    const derived = pos.derive({ castlingRights: rights });
    expect(derived.castlingRights).toEqual(rights);
  });

  it('sets en passant square', () => {
    const pos = new Position({ board: STARTING_POSITION });
    const derived = pos.derive({ enPassantSquare: 'e3' });
    expect(derived.enPassantSquare).toBe('e3');
  });

  it('clears en passant square with undefined', () => {
    const pos = new Position({ enPassantSquare: 'e3' });
    const derived = pos.derive({ enPassantSquare: undefined });
    expect(derived.enPassantSquare).toBeUndefined();
  });

  it('overrides halfmove clock and fullmove number', () => {
    const pos = new Position({ board: STARTING_POSITION });
    const derived = pos.derive({ halfmoveClock: 5, fullmoveNumber: 10 });
    expect(derived.halfmoveClock).toBe(5);
    expect(derived.fullmoveNumber).toBe(10);
  });

  it('applies board and options together', () => {
    const pos = new Position({ board: STARTING_POSITION });
    const derived = pos.derive({
      changes: [
        ['e2', undefined],
        ['e4', { color: 'white', type: 'pawn' }],
      ],
      turn: 'black',
      halfmoveClock: 0,
      fullmoveNumber: 1,
      enPassantSquare: 'e3',
    });
    expect(derived.at('e2')).toBeUndefined();
    expect(derived.at('e4')).toEqual({ color: 'white', type: 'pawn' });
    expect(derived.turn).toBe('black');
    expect(derived.enPassantSquare).toBe('e3');
  });

  it('last tuple wins when multiple target the same square', () => {
    const pos = new Position({ board: STARTING_POSITION });
    const derived = pos.derive({
      changes: [
        ['e4', { color: 'white', type: 'pawn' }],
        ['e4', { color: 'black', type: 'queen' }],
      ],
    });
    expect(derived.at('e4')).toEqual({ color: 'black', type: 'queen' });
  });

  it('supports chained derive calls', () => {
    const pos = new Position({ board: STARTING_POSITION });
    const derived = pos
      .derive({ changes: [['e2', undefined]], turn: 'black' })
      .derive({ changes: [['e4', { color: 'white', type: 'pawn' }]] });
    expect(derived.at('e2')).toBeUndefined();
    expect(derived.at('e4')).toEqual({ color: 'white', type: 'pawn' });
    expect(derived.turn).toBe('black');
  });

  it('produces correct Zobrist hash', () => {
    const pos = new Position({ board: STARTING_POSITION });
    const derived = pos.derive({
      changes: [
        ['e2', undefined],
        ['e4', { color: 'white', type: 'pawn' }],
      ],
      turn: 'black',
      enPassantSquare: 'e3',
    });
    // reconstruct same position via constructor
    const board = new Map(pos.pieces());
    board.delete('e2');
    board.set('e4', { color: 'white', type: 'pawn' });
    const expected = new Position({
      board,
      turn: 'black',
      enPassantSquare: 'e3',
    });
    expect(derived.hash).toBe(expected.hash);
  });
});
