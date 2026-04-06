import { COLORS, FILES, PIECE_TYPES, SQUARES } from './primitives.js';

import type { Color, File, PieceType, Square } from './types.js';

// Seeded LCG for deterministic random numbers (no Math.random — must be stable across runs)
function lcg(seed: number): () => bigint {
  let s = BigInt(seed);
  return () => {
    s =
      (s * 6_364_136_223_846_793_005n + 1_442_695_040_888_963_407n) &
      0xff_ff_ff_ff_ff_ff_ff_ffn;
    return s;
  };
}

const next = lcg(0xde_ad_be_ef);

// Piece table: PIECE_TABLE[square][pieceType][color]
const PIECE_TABLE: Record<
  Square,
  Partial<Record<PieceType, Record<Color, bigint>>>
> = Object.fromEntries(
  SQUARES.map((sq) => [
    sq,
    Object.fromEntries(
      PIECE_TYPES.map((pt) => [
        pt,
        Object.fromEntries(COLORS.map((c) => [c, next()])),
      ]),
    ),
  ]),
) as Record<Square, Partial<Record<PieceType, Record<Color, bigint>>>>;

const TURN_TABLE: Record<Color, bigint> = {
  black: next(),
  white: next(),
};

const CASTLING_TABLE: Record<string, bigint> = {
  'black.king': next(),
  'black.queen': next(),
  'white.king': next(),
  'white.queen': next(),
};

const EP_TABLE: Record<File, bigint> = Object.fromEntries(
  FILES.map((f) => [f, next()]),
) as Record<File, bigint>;

export { CASTLING_TABLE, EP_TABLE, PIECE_TABLE, TURN_TABLE };
