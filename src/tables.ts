import { OFF_BOARD } from './board.js';

import type { PieceType } from './types.js';

// ── Direction constants ───────────────────────────────────────────────────────

const KNIGHT_OFFSETS_0X88 = [-33, -31, -18, -14, 14, 18, 31, 33] as const;
const BISHOP_DIRS_0X88 = [-17, -15, 15, 17] as const;
const ROOK_DIRS_0X88 = [-16, -1, 1, 16] as const;
const KING_OFFSETS_0X88 = [-17, -16, -15, -1, 1, 15, 16, 17] as const;

// ── Piece bitmasks ────────────────────────────────────────────────────────────

const PAWN_MASK = 0x01;
const KNIGHT_MASK = 0x02;
const BISHOP_MASK = 0x04;
const ROOK_MASK = 0x08;
const KING_MASK = 0x10;

const PIECE_MASKS: Record<PieceType, number> = {
  bishop: BISHOP_MASK,
  king: KING_MASK,
  knight: KNIGHT_MASK,
  pawn: PAWN_MASK,
  queen: BISHOP_MASK | ROOK_MASK,
  rook: ROOK_MASK,
};

// ── ATTACKS / RAYS lookup tables ──────────────────────────────────────────────
//
// ATTACKS[diff + DIFF_OFFSET] — bitmask of piece types that can attack along
// the vector represented by `diff` (target_index - attacker_index).
//
// RAYS[diff + DIFF_OFFSET] — the ray step direction for sliding pieces (0 for
// non-sliding pieces).
//
// DIFF_OFFSET = 119 centres the diff range [-119, +119] at index 0.

const DIFF_OFFSET = 119;

const ATTACKS: number[] = Array.from<number>({ length: 240 }).fill(0);
const RAYS: number[] = Array.from<number>({ length: 240 }).fill(0);

(function initAttackTables() {
  // Knight
  for (const offset of KNIGHT_OFFSETS_0X88) {
    ATTACKS[offset + DIFF_OFFSET] =
      (ATTACKS[offset + DIFF_OFFSET] ?? 0) | KNIGHT_MASK;
  }

  // King
  for (const offset of KING_OFFSETS_0X88) {
    ATTACKS[offset + DIFF_OFFSET] =
      (ATTACKS[offset + DIFF_OFFSET] ?? 0) | KING_MASK;
  }

  // Pawns — white attacks at offsets -17 and -15 (toward rank 8 = lower index)
  // black attacks at +15 and +17. Both share PAWN_MASK; color checked at use time.
  for (const offset of [15, 17]) {
    ATTACKS[offset + DIFF_OFFSET] =
      (ATTACKS[offset + DIFF_OFFSET] ?? 0) | PAWN_MASK;
    ATTACKS[-offset + DIFF_OFFSET] =
      (ATTACKS[-offset + DIFF_OFFSET] ?? 0) | PAWN_MASK;
  }

  // Sliding pieces — walk every ray from every valid square
  for (let from = 0; from <= 119; from++) {
    if (from & OFF_BOARD) {
      continue;
    }

    for (const direction of ROOK_DIRS_0X88) {
      let to = from + direction;
      while (!(to & OFF_BOARD)) {
        const diff = to - from;
        ATTACKS[diff + DIFF_OFFSET] =
          (ATTACKS[diff + DIFF_OFFSET] ?? 0) | ROOK_MASK;
        RAYS[diff + DIFF_OFFSET] = direction;
        to += direction;
      }
    }

    for (const direction of BISHOP_DIRS_0X88) {
      let to = from + direction;
      while (!(to & OFF_BOARD)) {
        const diff = to - from;
        ATTACKS[diff + DIFF_OFFSET] =
          (ATTACKS[diff + DIFF_OFFSET] ?? 0) | BISHOP_MASK;
        RAYS[diff + DIFF_OFFSET] = direction;
        to += direction;
      }
    }
  }
})();

export { ATTACKS, DIFF_OFFSET, PIECE_MASKS, RAYS };
