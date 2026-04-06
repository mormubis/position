import type { PieceMove } from './types.js';

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

/**
 * Pawn move offsets on the 0x88 board, by color. Push is the forward
 * direction; captures are the two diagonal attack directions.
 */
const PAWN_MOVES: {
  readonly black: {
    readonly captures: readonly PieceMove[];
    readonly push: PieceMove;
  };
  readonly white: {
    readonly captures: readonly PieceMove[];
    readonly push: PieceMove;
  };
} = {
  black: {
    captures: [{ offset: 15 }, { offset: 17 }],
    push: { offset: 16 },
  },
  white: {
    captures: [{ offset: -17 }, { offset: -15 }],
    push: { offset: -16 },
  },
};

const QUEEN_MOVES: readonly PieceMove[] = [...BISHOP_MOVES, ...ROOK_MOVES];

export {
  BISHOP_MOVES,
  KING_MOVES,
  KNIGHT_MOVES,
  PAWN_MOVES,
  QUEEN_MOVES,
  ROOK_MOVES,
};
