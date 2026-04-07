import type { PieceMove } from './types.js';

// Pawn moves are hardcoded in Position.reach (src/position.ts:345)

/** Knight move offsets on the 0x88 board — 8 L-shaped hops. */
const KNIGHT_MOVES: readonly PieceMove[] = [
  { offset: -33 },
  { offset: -31 },
  { offset: -18 },
  { offset: -14 },
  { offset: 14 },
  { offset: 18 },
  { offset: 31 },
  { offset: 33 },
];

/** Bishop move directions on the 0x88 board — 4 diagonals, sliding. */
const BISHOP_MOVES: readonly PieceMove[] = [
  { offset: -17, slide: true },
  { offset: -15, slide: true },
  { offset: 15, slide: true },
  { offset: 17, slide: true },
];

/** Rook move directions on the 0x88 board — 4 rank/file directions, sliding. */
const ROOK_MOVES: readonly PieceMove[] = [
  { offset: -16, slide: true },
  { offset: -1, slide: true },
  { offset: 1, slide: true },
  { offset: 16, slide: true },
];

/** King move offsets on the 0x88 board — 8 adjacent squares. */
const KING_MOVES: readonly PieceMove[] = [
  { offset: -17 },
  { offset: -16 },
  { offset: -15 },
  { offset: -1 },
  { offset: 1 },
  { offset: 15 },
  { offset: 16 },
  { offset: 17 },
];

const QUEEN_MOVES: readonly PieceMove[] = [...BISHOP_MOVES, ...ROOK_MOVES];

export { BISHOP_MOVES, KING_MOVES, KNIGHT_MOVES, QUEEN_MOVES, ROOK_MOVES };
