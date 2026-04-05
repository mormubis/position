import { describe, expect, it } from 'vitest';

import { Position } from '../position.js';

import type { Piece, Square } from '../types.js';

describe('Position constructor', () => {
  it('defaults to starting position with no args', () => {
    const pos = new Position();
    expect(pos.turn).toBe('white');
    expect(pos.halfmoveClock).toBe(0);
    expect(pos.fullmoveNumber).toBe(1);
    expect(pos.castlingRights).toEqual({
      black: { king: true, queen: true },
      white: { king: true, queen: true },
    });
    expect(pos.enPassantSquare).toBeUndefined();
  });

  it('starting position has 32 pieces', () => {
    const pos = new Position();
    expect(pos.pieces().size).toBe(32);
  });

  it('accepts a custom board', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
    ]);
    const pos = new Position(board);
    expect(pos.pieces().size).toBe(2);
    expect(pos.turn).toBe('white');
  });

  it('accepts options to override defaults', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
    ]);
    const pos = new Position(board, {
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
    const pos = new Position();
    expect(pos.piece('e1')).toEqual({ color: 'white', type: 'king' });
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
    expect(pos.pieces('white').size).toBe(16);
  });

  it('returns 16 black pieces', () => {
    const pos = new Position();
    expect(pos.pieces('black').size).toBe(16);
  });
});

describe('isAttacked', () => {
  it('returns true when a white pawn attacks the square diagonally', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['d3', { color: 'white', type: 'pawn' }],
    ]);
    const pos = new Position(board);
    expect(pos.isAttacked('e4', 'white')).toBe(true);
  });

  it('returns false when no piece attacks the square', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
    ]);
    const pos = new Position(board);
    expect(pos.isAttacked('e4', 'black')).toBe(false);
  });

  it('returns true when a knight attacks the square', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['f6', { color: 'black', type: 'knight' }],
    ]);
    const pos = new Position(board);
    expect(pos.isAttacked('e4', 'black')).toBe(true);
    expect(pos.isAttacked('g4', 'black')).toBe(true);
    expect(pos.isAttacked('a1', 'black')).toBe(false);
  });

  // Ported from chess.js isAttacked test suite
  it('white pawn attacks diagonally but not forward', () => {
    // 4k3/4p3/8/8/8/8/4P3/4K3 w - - 0 1
    const board = new Map<Square, Piece>([
      ['e8', { color: 'black', type: 'king' }],
      ['e7', { color: 'black', type: 'pawn' }],
      ['e2', { color: 'white', type: 'pawn' }],
      ['e1', { color: 'white', type: 'king' }],
    ]);
    const pos = new Position(board);
    expect(pos.isAttacked('d3', 'white')).toBe(true);
    expect(pos.isAttacked('f3', 'white')).toBe(true);
    expect(pos.isAttacked('d3', 'black')).toBe(false);
    expect(pos.isAttacked('f3', 'black')).toBe(false);
    // pawn forward moves are not attacks
    expect(pos.isAttacked('e3', 'white')).toBe(false);
    expect(pos.isAttacked('e4', 'white')).toBe(false);
  });

  it('black pawn attacks diagonally but not forward', () => {
    // 4k3/4p3/8/8/8/8/4P3/4K3 w - - 0 1
    const board = new Map<Square, Piece>([
      ['e8', { color: 'black', type: 'king' }],
      ['e7', { color: 'black', type: 'pawn' }],
      ['e2', { color: 'white', type: 'pawn' }],
      ['e1', { color: 'white', type: 'king' }],
    ]);
    const pos = new Position(board);
    expect(pos.isAttacked('f6', 'black')).toBe(true);
    expect(pos.isAttacked('d6', 'black')).toBe(true);
    expect(pos.isAttacked('f6', 'white')).toBe(false);
    expect(pos.isAttacked('d6', 'white')).toBe(false);
    // pawn forward moves are not attacks
    expect(pos.isAttacked('e6', 'black')).toBe(false);
    expect(pos.isAttacked('e5', 'black')).toBe(false);
  });

  it('knight attacks all 8 squares and not its own square', () => {
    // 4k3/4p3/8/8/4N3/8/8/4K3 w - - 0 1
    const board = new Map<Square, Piece>([
      ['e8', { color: 'black', type: 'king' }],
      ['e4', { color: 'white', type: 'knight' }],
      ['e1', { color: 'white', type: 'king' }],
    ]);
    const pos = new Position(board);
    for (const sq of [
      'd2',
      'f2',
      'c3',
      'g3',
      'd6',
      'f6',
      'c5',
      'g5',
    ] as Square[]) {
      expect(pos.isAttacked(sq, 'white')).toBe(true);
    }
    expect(pos.isAttacked('e4', 'white')).toBe(false); // same square
  });

  it('bishop attacks all diagonals and not its own square', () => {
    // 4k3/4p3/8/8/4b3/8/8/4K3 — black bishop on e4
    const board = new Map<Square, Piece>([
      ['e8', { color: 'black', type: 'king' }],
      ['e4', { color: 'black', type: 'bishop' }],
      ['e1', { color: 'white', type: 'king' }],
    ]);
    const pos = new Position(board);
    for (const sq of [
      'b1',
      'c2',
      'd3',
      'f5',
      'g6',
      'h7',
      'a8',
      'b7',
      'c6',
      'd5',
      'f3',
      'g2',
      'h1',
    ] as Square[]) {
      expect(pos.isAttacked(sq, 'black')).toBe(true);
    }
    expect(pos.isAttacked('e4', 'black')).toBe(false); // same square
  });

  it('rook attacks rank and file, can attack own color, not its own square', () => {
    // 4k3/4n3/8/8/8/4R3/8/4K3 — white rook on e3, black knight on e7
    const board = new Map<Square, Piece>([
      ['e8', { color: 'black', type: 'king' }],
      ['e7', { color: 'black', type: 'knight' }],
      ['e3', { color: 'white', type: 'rook' }],
      ['e1', { color: 'white', type: 'king' }],
    ]);
    const pos = new Position(board);
    for (const sq of [
      'e1',
      'e2',
      'e4',
      'e5',
      'e6',
      'e7',
      'a3',
      'b3',
      'c3',
      'd3',
      'f3',
      'g3',
      'h3',
    ] as Square[]) {
      expect(pos.isAttacked(sq, 'white')).toBe(true);
    }
    expect(pos.isAttacked('e3', 'white')).toBe(false); // same square
    expect(pos.isAttacked('e8', 'white')).toBe(false); // blocked by e7
  });

  it('queen attacks rank, file, and diagonals', () => {
    // 4k3/4n3/8/8/8/4q3/4P3/4K3 — black queen on e3
    const board = new Map<Square, Piece>([
      ['e8', { color: 'black', type: 'king' }],
      ['e7', { color: 'black', type: 'knight' }],
      ['e3', { color: 'black', type: 'queen' }],
      ['e2', { color: 'white', type: 'pawn' }],
      ['e1', { color: 'white', type: 'king' }],
    ]);
    const pos = new Position(board);
    for (const sq of [
      'e2',
      'e4',
      'e5',
      'e6',
      'e7',
      'a3',
      'b3',
      'c3',
      'd3',
      'f3',
      'g3',
      'h3',
      'c1',
      'd2',
      'f4',
      'g5',
      'h6',
      'g1',
      'f2',
      'd4',
      'c5',
      'b6',
      'a7',
    ] as Square[]) {
      expect(pos.isAttacked(sq, 'black')).toBe(true);
    }
    expect(pos.isAttacked('e3', 'black')).toBe(false); // same square
    expect(pos.isAttacked('e1', 'black')).toBe(false); // blocked by e2
  });

  it('king attacks all adjacent squares and not its own square', () => {
    // 4k3/4n3/8/8/8/4q3/4P3/4K3 — white king on e1
    const board = new Map<Square, Piece>([
      ['e8', { color: 'black', type: 'king' }],
      ['e1', { color: 'white', type: 'king' }],
      ['e2', { color: 'white', type: 'pawn' }],
    ]);
    const pos = new Position(board);
    for (const sq of ['e2', 'd1', 'd2', 'f1', 'f2'] as Square[]) {
      expect(pos.isAttacked(sq, 'white')).toBe(true);
    }
    expect(pos.isAttacked('e1', 'white')).toBe(false); // same square
  });

  it('pinned pieces still attack squares', () => {
    // 4k3/4r3/8/8/8/8/4P3/4K3 — white pawn on e2, pinned by black rook on e7
    const board = new Map<Square, Piece>([
      ['e8', { color: 'black', type: 'king' }],
      ['e7', { color: 'black', type: 'rook' }],
      ['e2', { color: 'white', type: 'pawn' }],
      ['e1', { color: 'white', type: 'king' }],
    ]);
    const pos = new Position(board);
    expect(pos.isAttacked('d3', 'white')).toBe(true);
    expect(pos.isAttacked('f3', 'white')).toBe(true);
  });

  it('no x-ray through blocking piece', () => {
    // 4k3/4n3/8/8/8/4q3/4P3/4K3 — black queen on e3 blocked by white pawn e2
    const board = new Map<Square, Piece>([
      ['e8', { color: 'black', type: 'king' }],
      ['e7', { color: 'black', type: 'knight' }],
      ['e3', { color: 'black', type: 'queen' }],
      ['e2', { color: 'white', type: 'pawn' }],
      ['e1', { color: 'white', type: 'king' }],
    ]);
    const pos = new Position(board);
    expect(pos.isAttacked('e1', 'black')).toBe(false);
  });

  it('empty squares can be attacked', () => {
    const pos = new Position();
    expect(pos.isAttacked('f3', 'white')).toBe(true);
    expect(pos.isAttacked('f6', 'black')).toBe(true);
  });

  it('can attack own color pieces', () => {
    const pos = new Position();
    expect(pos.isAttacked('e2', 'white')).toBe(true);
  });
});

describe('attackers', () => {
  it('returns squares of pieces attacking the target', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['f6', { color: 'black', type: 'knight' }],
      ['f5', { color: 'black', type: 'bishop' }],
    ]);
    const pos = new Position(board);
    const atk = pos.attackers('e4', 'black');
    expect(atk).toContain('f6');
    expect(atk).toContain('f5');
  });

  it('returns empty array when no attackers', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
    ]);
    const pos = new Position(board);
    expect(pos.attackers('e4', 'black')).toEqual([]);
  });
});

describe('isInsufficientMaterial', () => {
  it('returns false for starting position', () => {
    expect(new Position().isInsufficientMaterial).toBe(false);
  });

  it('returns true for K vs K', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
    ]);
    expect(new Position(board).isInsufficientMaterial).toBe(true);
  });

  it('returns true for K vs KB', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
      ['c1', { color: 'white', type: 'bishop' }],
    ]);
    expect(new Position(board).isInsufficientMaterial).toBe(true);
  });

  it('returns true for K vs KN', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
      ['c1', { color: 'black', type: 'knight' }],
    ]);
    expect(new Position(board).isInsufficientMaterial).toBe(true);
  });

  it('returns false for K vs KR', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
      ['a1', { color: 'white', type: 'rook' }],
    ]);
    expect(new Position(board).isInsufficientMaterial).toBe(false);
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
    expect(new Position(board).isInsufficientMaterial).toBe(true);
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
    expect(new Position(board).isInsufficientMaterial).toBe(true);
  });

  it('returns false for KB vs KB with bishops on opposite color squares', () => {
    // 5k1K/7B/8/6b1/8/8/8/8 — white bishop on h7 (light), black bishop on g5 (dark)
    const board = new Map<Square, Piece>([
      ['h8', { color: 'white', type: 'king' }],
      ['f8', { color: 'black', type: 'king' }],
      ['h7', { color: 'white', type: 'bishop' }],
      ['g5', { color: 'black', type: 'bishop' }],
    ]);
    expect(new Position(board).isInsufficientMaterial).toBe(false);
  });

  it('returns false for KN vs KB', () => {
    const board = new Map<Square, Piece>([
      ['h8', { color: 'white', type: 'king' }],
      ['f8', { color: 'black', type: 'king' }],
      ['h7', { color: 'white', type: 'knight' }],
      ['g5', { color: 'black', type: 'bishop' }],
    ]);
    expect(new Position(board).isInsufficientMaterial).toBe(false);
  });

  it('returns false for KN vs KN', () => {
    const board = new Map<Square, Piece>([
      ['h8', { color: 'white', type: 'king' }],
      ['f8', { color: 'black', type: 'king' }],
      ['h7', { color: 'white', type: 'knight' }],
      ['e5', { color: 'black', type: 'knight' }],
    ]);
    expect(new Position(board).isInsufficientMaterial).toBe(false);
  });
});

describe('isValid', () => {
  it('returns true for starting position', () => {
    expect(new Position().isValid).toBe(true);
  });

  it('returns false when white king is missing', () => {
    const board = new Map<Square, Piece>([
      ['e8', { color: 'black', type: 'king' }],
    ]);
    expect(new Position(board).isValid).toBe(false);
  });

  it('returns false when black king is missing', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
    ]);
    expect(new Position(board).isValid).toBe(false);
  });

  it('returns false when a pawn is on rank 1', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
      ['a1', { color: 'white', type: 'pawn' }],
    ]);
    expect(new Position(board).isValid).toBe(false);
  });

  it('returns false when a pawn is on rank 8', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
      ['a8', { color: 'black', type: 'pawn' }],
    ]);
    expect(new Position(board).isValid).toBe(false);
  });

  it('returns false when the side not to move is in check', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
      ['e2', { color: 'white', type: 'rook' }],
    ]);
    // It is white's turn, but black king is in check from white rook — invalid
    const pos = new Position(board, { turn: 'white' });
    expect(pos.isValid).toBe(false);
  });
});

describe('isCheck', () => {
  it('returns false for starting position', () => {
    expect(new Position().isCheck).toBe(false);
  });

  it('returns true when king is attacked by a rook on same file', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'rook' }],
    ]);
    const pos = new Position(board, { turn: 'white' });
    expect(pos.isCheck).toBe(true);
  });

  it('returns false when sliding attacker is blocked', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e4', { color: 'white', type: 'pawn' }],
      ['e8', { color: 'black', type: 'rook' }],
    ]);
    const pos = new Position(board, { turn: 'white' });
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
    const pos = new Position(board, { turn: 'white' });
    expect(pos.isCheck).toBe(true);
  });

  it('returns true for checkmate position (checkmate is also check)', () => {
    // R3k3/8/4K3/8/8/8/8/8 b - - 0 1 — black king checkmated by white rook
    const board = new Map<Square, Piece>([
      ['a8', { color: 'white', type: 'rook' }],
      ['e8', { color: 'black', type: 'king' }],
      ['e6', { color: 'white', type: 'king' }],
    ]);
    const pos = new Position(board, { turn: 'black' });
    expect(pos.isCheck).toBe(true);
  });

  it('returns false for stalemate position (stalemate is not check)', () => {
    // 4k3/4P3/4K3/8/8/8/8/8 b - - 0 1 — black king stalemated
    const board = new Map<Square, Piece>([
      ['e8', { color: 'black', type: 'king' }],
      ['e7', { color: 'white', type: 'pawn' }],
      ['e6', { color: 'white', type: 'king' }],
    ]);
    const pos = new Position(board, { turn: 'black' });
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
    const pos2 = new Position(board);
    expect(pos1.hash).not.toBe(pos2.hash);
  });

  it('returns different hashes for different turns', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'white', type: 'king' }],
      ['e8', { color: 'black', type: 'king' }],
    ]);
    const posW = new Position(board, { turn: 'white' });
    const posB = new Position(board, { turn: 'black' });
    expect(posW.hash).not.toBe(posB.hash);
  });
});

describe('derive', () => {
  it('returns a clone when called with no arguments', () => {
    const pos = new Position();
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
    const pos = new Position();
    const derived = pos.derive({
      changes: [
        ['e2', undefined],
        ['e4', { color: 'white', type: 'pawn' }],
      ],
    });
    expect(derived.piece('e2')).toBeUndefined();
    expect(derived.piece('e4')).toEqual({ color: 'white', type: 'pawn' });
  });

  it('does not modify the original position', () => {
    const pos = new Position();
    pos.derive({
      changes: [['e2', undefined]],
    });
    expect(pos.piece('e2')).toEqual({ color: 'white', type: 'pawn' });
  });

  it('overrides turn', () => {
    const pos = new Position();
    const derived = pos.derive({ turn: 'black' });
    expect(derived.turn).toBe('black');
    expect(pos.turn).toBe('white');
  });

  it('overrides castling rights', () => {
    const pos = new Position();
    const rights = {
      black: { king: false, queen: false },
      white: { king: false, queen: false },
    };
    const derived = pos.derive({ castlingRights: rights });
    expect(derived.castlingRights).toEqual(rights);
  });

  it('sets en passant square', () => {
    const pos = new Position();
    const derived = pos.derive({ enPassantSquare: 'e3' });
    expect(derived.enPassantSquare).toBe('e3');
  });

  it('clears en passant square with undefined', () => {
    const pos = new Position(undefined, { enPassantSquare: 'e3' });
    const derived = pos.derive({ enPassantSquare: undefined });
    expect(derived.enPassantSquare).toBeUndefined();
  });

  it('overrides halfmove clock and fullmove number', () => {
    const pos = new Position();
    const derived = pos.derive({ halfmoveClock: 5, fullmoveNumber: 10 });
    expect(derived.halfmoveClock).toBe(5);
    expect(derived.fullmoveNumber).toBe(10);
  });

  it('applies board and options together', () => {
    const pos = new Position();
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
    expect(derived.piece('e2')).toBeUndefined();
    expect(derived.piece('e4')).toEqual({ color: 'white', type: 'pawn' });
    expect(derived.turn).toBe('black');
    expect(derived.enPassantSquare).toBe('e3');
  });

  it('last tuple wins when multiple target the same square', () => {
    const pos = new Position();
    const derived = pos.derive({
      changes: [
        ['e4', { color: 'white', type: 'pawn' }],
        ['e4', { color: 'black', type: 'queen' }],
      ],
    });
    expect(derived.piece('e4')).toEqual({ color: 'black', type: 'queen' });
  });

  it('supports chained derive calls', () => {
    const pos = new Position();
    const derived = pos
      .derive({ changes: [['e2', undefined]], turn: 'black' })
      .derive({ changes: [['e4', { color: 'white', type: 'pawn' }]] });
    expect(derived.piece('e2')).toBeUndefined();
    expect(derived.piece('e4')).toEqual({ color: 'white', type: 'pawn' });
    expect(derived.turn).toBe('black');
  });

  it('produces correct Zobrist hash', () => {
    const pos = new Position();
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
    const expected = new Position(board, {
      turn: 'black',
      enPassantSquare: 'e3',
    });
    expect(derived.hash).toBe(expected.hash);
  });
});
