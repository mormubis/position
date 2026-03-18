import type { Color, File, PieceType, Square } from '../types.js';

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

const COLORS_Z: Color[] = ['b', 'w'];
const FILES_Z: File[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS_Z = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;
const PIECE_TYPES_Z: PieceType[] = ['b', 'k', 'n', 'p', 'q', 'r'];
const SQUARES_Z: Square[] = FILES_Z.flatMap((f) =>
  [...RANKS_Z].toReversed().map((r) => `${f}${r}` as Square),
);

// Piece table: PIECE_TABLE[square][pieceType][color]
const PIECE_TABLE: Record<
  Square,
  Partial<Record<PieceType, Record<Color, bigint>>>
> = Object.fromEntries(
  SQUARES_Z.map((sq) => [
    sq,
    Object.fromEntries(
      PIECE_TYPES_Z.map((pt) => [
        pt,
        Object.fromEntries(COLORS_Z.map((c) => [c, next()])),
      ]),
    ),
  ]),
) as Record<Square, Partial<Record<PieceType, Record<Color, bigint>>>>;

const TURN_TABLE: Record<Color, bigint> = {
  b: next(),
  w: next(),
};

const CASTLING_TABLE: Record<string, bigint> = {
  bK: next(),
  bQ: next(),
  wK: next(),
  wQ: next(),
};

const EP_TABLE: Record<File, bigint> = Object.fromEntries(
  FILES_Z.map((f) => [f, next()]),
) as Record<File, bigint>;

export { CASTLING_TABLE, EP_TABLE, PIECE_TABLE, TURN_TABLE };
