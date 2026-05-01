import { describe, expect, it } from 'vitest';

import { STARTING_POSITION } from '../constants.js';
import { Position } from '../position.js';

import type { Piece, Square } from '../types.js';

const minBoard = new Map<Square, Piece>([
  ['e1', { color: 'white', type: 'king' }],
  ['e8', { color: 'black', type: 'king' }],
]);

describe('reach', () => {
  describe('knight', () => {
    it('returns all 8 squares from center of empty board', () => {
      const pos = new Position({ board: minBoard });
      const squares = pos.reach('e4', { color: 'white', type: 'knight' });
      expect(squares.toSorted()).toEqual(
        ['c3', 'c5', 'd2', 'd6', 'f2', 'f6', 'g3', 'g5'].toSorted(),
      );
    });

    it('returns fewer squares from corner', () => {
      const pos = new Position({ board: minBoard });
      const squares = pos.reach('a1', { color: 'white', type: 'knight' });
      expect(squares.toSorted()).toEqual(['b3', 'c2'].toSorted());
    });

    it('filters out same-color pieces', () => {
      const pos = new Position({ board: STARTING_POSITION });
      const squares = pos.reach('g1', { color: 'white', type: 'knight' });
      expect(squares.toSorted()).toEqual(['f3', 'h3'].toSorted());
    });

    it('includes enemy pieces', () => {
      const board = new Map<Square, Piece>([
        ['e1', { color: 'white', type: 'king' }],
        ['e8', { color: 'black', type: 'king' }],
        ['f6', { color: 'black', type: 'pawn' }],
      ]);
      const pos = new Position({ board });
      const squares = pos.reach('e4', { color: 'white', type: 'knight' });
      expect(squares).toContain('f6');
    });
  });

  describe('bishop', () => {
    it('slides along diagonals on empty board', () => {
      const pos = new Position({ board: minBoard });
      const squares = pos.reach('c1', { color: 'white', type: 'bishop' });
      expect(squares).toContain('d2');
      expect(squares).toContain('h6');
      expect(squares).toContain('b2');
      expect(squares).toContain('a3');
    });

    it('stops before same-color piece', () => {
      const pos = new Position({ board: STARTING_POSITION });
      const squares = pos.reach('c1', { color: 'white', type: 'bishop' });
      expect(squares).toEqual([]);
    });

    it('includes enemy piece and stops', () => {
      const board = new Map<Square, Piece>([
        ['e1', { color: 'white', type: 'king' }],
        ['e8', { color: 'black', type: 'king' }],
        ['e3', { color: 'black', type: 'pawn' }],
      ]);
      const pos = new Position({ board });
      const squares = pos.reach('c1', { color: 'white', type: 'bishop' });
      expect(squares).toContain('d2');
      expect(squares).toContain('e3');
      expect(squares).not.toContain('f4');
    });
  });

  describe('rook', () => {
    it('slides along rank and file', () => {
      const pos = new Position({ board: minBoard });
      const squares = pos.reach('e4', { color: 'white', type: 'rook' });
      expect(squares).toContain('e5');
      expect(squares).toContain('e8');
      expect(squares).toContain('a4');
      expect(squares).toContain('h4');
      expect(squares).toContain('e2');
    });

    it('stops before friendly king', () => {
      const pos = new Position({ board: minBoard });
      const squares = pos.reach('e4', { color: 'white', type: 'rook' });
      expect(squares).not.toContain('e1');
      expect(squares).toContain('e2');
    });
  });

  describe('queen', () => {
    it('slides along all 8 directions', () => {
      const pos = new Position({ board: minBoard });
      const squares = pos.reach('d4', { color: 'white', type: 'queen' });
      expect(squares).toContain('d5');
      expect(squares).toContain('e5');
      expect(squares).toContain('e4');
      expect(squares).toContain('e3');
      expect(squares).toContain('d3');
      expect(squares).toContain('c3');
      expect(squares).toContain('c4');
      expect(squares).toContain('c5');
    });
  });

  describe('king', () => {
    it('returns all adjacent squares on empty board', () => {
      const pos = new Position({ board: minBoard });
      const squares = pos.reach('d4', { color: 'white', type: 'king' });
      expect(squares.toSorted()).toEqual(
        ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5'].toSorted(),
      );
    });

    it('filters out same-color pieces', () => {
      const pos = new Position({ board: STARTING_POSITION });
      const squares = pos.reach('e1', { color: 'white', type: 'king' });
      expect(squares).toEqual([]);
    });
  });

  describe('pawn', () => {
    it('white pawn pushes one square forward on empty board', () => {
      const pos = new Position({ board: minBoard });
      const squares = pos.reach('e4', { color: 'white', type: 'pawn' });
      expect(squares).toEqual(['e5']);
    });

    it('white pawn double pushes from starting rank', () => {
      const pos = new Position({ board: minBoard });
      const squares = pos.reach('e2', { color: 'white', type: 'pawn' });
      expect(squares).toContain('e3');
      expect(squares).toContain('e4');
    });

    it('black pawn pushes in opposite direction', () => {
      const pos = new Position({ board: minBoard });
      const squares = pos.reach('e5', { color: 'black', type: 'pawn' });
      expect(squares).toEqual(['e4']);
    });

    it('black pawn double pushes from starting rank', () => {
      const pos = new Position({ board: minBoard });
      const squares = pos.reach('e7', { color: 'black', type: 'pawn' });
      expect(squares).toContain('e6');
      expect(squares).toContain('e5');
    });

    it('push is blocked by any piece', () => {
      const board = new Map<Square, Piece>([
        ['e1', { color: 'white', type: 'king' }],
        ['e8', { color: 'black', type: 'king' }],
        ['e3', { color: 'black', type: 'pawn' }],
      ]);
      const pos = new Position({ board });
      const squares = pos.reach('e2', { color: 'white', type: 'pawn' });
      expect(squares).not.toContain('e3');
      expect(squares).not.toContain('e4');
    });

    it('double push blocked when intermediate square occupied', () => {
      const board = new Map<Square, Piece>([
        ['e1', { color: 'white', type: 'king' }],
        ['e8', { color: 'black', type: 'king' }],
        ['e3', { color: 'white', type: 'knight' }],
      ]);
      const pos = new Position({ board });
      const squares = pos.reach('e2', { color: 'white', type: 'pawn' });
      expect(squares).not.toContain('e3');
      expect(squares).not.toContain('e4');
    });

    it('captures diagonally when enemy piece present', () => {
      const board = new Map<Square, Piece>([
        ['e1', { color: 'white', type: 'king' }],
        ['e8', { color: 'black', type: 'king' }],
        ['d5', { color: 'black', type: 'pawn' }],
      ]);
      const pos = new Position({ board });
      const squares = pos.reach('e4', { color: 'white', type: 'pawn' });
      expect(squares).toContain('d5');
      expect(squares).toContain('e5');
    });

    it('does not capture same-color piece', () => {
      const board = new Map<Square, Piece>([
        ['e1', { color: 'white', type: 'king' }],
        ['e8', { color: 'black', type: 'king' }],
        ['d5', { color: 'white', type: 'pawn' }],
      ]);
      const pos = new Position({ board });
      const squares = pos.reach('e4', { color: 'white', type: 'pawn' });
      expect(squares).not.toContain('d5');
    });

    it('does not capture on empty diagonal', () => {
      const pos = new Position({ board: minBoard });
      const squares = pos.reach('e4', { color: 'white', type: 'pawn' });
      expect(squares).not.toContain('d5');
      expect(squares).not.toContain('f5');
    });

    it('captures en passant square', () => {
      const board = new Map<Square, Piece>([
        ['e1', { color: 'white', type: 'king' }],
        ['e8', { color: 'black', type: 'king' }],
        ['d5', { color: 'black', type: 'pawn' }],
      ]);
      const pos = new Position({ board, enPassantSquare: 'f6' });
      const squares = pos.reach('e5', { color: 'white', type: 'pawn' });
      expect(squares).toContain('f6');
    });

    it('pawn on edge has one push direction', () => {
      const pos = new Position({ board: minBoard });
      const squares = pos.reach('a4', { color: 'white', type: 'pawn' });
      expect(squares).toEqual(['a5']);
    });
  });
});
