# Specification: Chess Position and 0x88 Board Representation

This package defines the `Position` type and implements attack detection using
the 0x88 board representation as described on the
[Chess Programming Wiki](https://www.chessprogramming.org/0x88).

---

## Position Type

A `Position` is a complete chess game state:

| Field | Type | Description |
|-------|------|-------------|
| `board` | `Map<Square, Piece>` | Occupied squares only |
| `turn` | `'w' \| 'b'` | Side to move |
| `castlingRights` | `CastlingRights` | Kingside/queenside rights per color |
| `enPassantSquare` | `Square \| undefined` | Target square for en passant capture |
| `halfmoveClock` | `number` | Halfmoves since last pawn move or capture |
| `fullmoveNumber` | `number` | Fullmove counter (increments after black's move) |

---

## 0x88 Board Representation

The board is a flat array of 128 elements. Only 64 are valid squares:

```
index = (8 - rank) * 16 + file
  where file: a=0, b=1, …, h=7
        rank: 1-based (1–8)
```

| Square | Index |
|--------|-------|
| a8 | 0 |
| h8 | 7 |
| a7 | 16 |
| a1 | 112 |
| h1 | 119 |

**Off-board detection:**
```
(index & 0x88) !== 0   →   off-board
```

This works because valid indices always have bit 3 of the low nibble = 0.
Any index with bit 3 set in the high nibble is in the unused padding region.

---

## Attack / Ray Lookup Tables

Two precomputed 240-element arrays indexed by `(target - attacker) + 119`:

- `ATTACKS[i]` — bitmask of piece types that can attack along this vector
- `RAYS[i]` — ray step direction for sliding pieces (0 for non-sliding)

### Piece Bitmasks

| Piece | Mask |
|-------|------|
| Pawn | `0x01` |
| Knight | `0x02` |
| Bishop | `0x04` |
| Rook | `0x08` |
| King | `0x10` |
| Queen | `0x04 \| 0x08` |

Pawn attacks are direction-dependent — the color is checked at use time.

---

## Internal Export (`./internal`)

The `./internal` export condition exposes the 0x88 utilities for use by
`@echecs/game` only. Do not use in application code.

Exports: `squareToIndex`, `indexToSquare`, `boardFromMap`, `ATTACKS`, `RAYS`,
`PIECE_MASKS`, `DIFF_OFFSET`, `OFF_BOARD`.

---

## Square Color

A square is **dark** if `(fileIndex + rank) % 2 === 1` where `a=0`.
A square is **light** if `(fileIndex + rank) % 2 === 0`.

Verified: a1 (file=0, rank=1) → 1 → dark ✓, b1 (file=1, rank=1) → 2 → light ✓.

## Sources

- [Chess Programming Wiki — 0x88](https://www.chessprogramming.org/0x88)
- [Chess Programming Wiki — Attack Tables](https://www.chessprogramming.org/Attack_and_Defend_Maps)
