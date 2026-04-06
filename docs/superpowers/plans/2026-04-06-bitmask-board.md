# Bitmask 0x88 Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the internal `Map<Square, Piece>` with a bitmask 0x88 array as
the single source of truth, add public readonly fields, and inline attack
detection.

**Architecture:** Position stores a 128-element `number[]` where each element is
0 (empty) or a bitmask encoding color + piece type. Public readonly fields
replace private + getter pass-throughs. `piece()` and `pieces()` convert
bitmasks to `Piece` objects at the boundary. `derive()` uses a private static
factory `#from()` to avoid Map round-trips. `isCheck` and `isValid` walk the
array directly with bitmask checks.

**Tech Stack:** TypeScript, Vitest, ESM-only

---

## File Structure

| File                             | Responsibility                                                                                       | Action |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| `src/board.ts`                   | `OFF_BOARD`, `squareToIndex`, bitmask constants, `pieceToBitmask`, `bitmaskToPiece`, `indexToSquare` | Modify |
| `src/position.ts`                | Position class — rewrite internals to use bitmask array                                              | Modify |
| `src/__tests__/board.spec.ts`    | Tests for bitmask conversion helpers                                                                 | Create |
| `src/__tests__/internal.spec.ts` | Rename to `board.spec.ts` — already tests `squareToIndex`                                            | Rename |

---

### Task 1: Add bitmask constants and conversion helpers to `board.ts`

**Files:**

- Modify: `src/board.ts`
- Rename: `src/__tests__/internal.spec.ts` → `src/__tests__/board.spec.ts`
- Modify: `src/__tests__/board.spec.ts`

- [ ] **Step 1: Write failing tests for bitmask helpers**

Rename `src/__tests__/internal.spec.ts` to `src/__tests__/board.spec.ts`. Then
append tests for the new helpers:

```typescript
import { describe, expect, it } from 'vitest';

import {
  BISHOP,
  BLACK,
  KING,
  KNIGHT,
  OFF_BOARD,
  PAWN,
  QUEEN,
  ROOK,
  WHITE,
  bitmaskToPiece,
  indexToSquare,
  pieceToBitmask,
  squareToIndex,
} from '../board.js';

describe('squareToIndex', () => {
  it('e4 → 68', () => {
    expect(squareToIndex('e4')).toBe(68);
  });
  it('a1 → 112', () => {
    expect(squareToIndex('a1')).toBe(112);
  });
  it('h8 → 7', () => {
    expect(squareToIndex('h8')).toBe(7);
  });
});

describe('indexToSquare', () => {
  it('68 → e4', () => {
    expect(indexToSquare(68)).toBe('e4');
  });
  it('112 → a1', () => {
    expect(indexToSquare(112)).toBe('a1');
  });
  it('7 → h8', () => {
    expect(indexToSquare(7)).toBe('h8');
  });
});

describe('bitmask constants', () => {
  it('WHITE is 0', () => {
    expect(WHITE).toBe(0);
  });
  it('BLACK is 8', () => {
    expect(BLACK).toBe(8);
  });
  it('piece types are 1-6', () => {
    expect(PAWN).toBe(1);
    expect(KNIGHT).toBe(2);
    expect(BISHOP).toBe(3);
    expect(ROOK).toBe(4);
    expect(QUEEN).toBe(5);
    expect(KING).toBe(6);
  });
});

describe('pieceToBitmask', () => {
  it('white pawn → 1', () => {
    expect(pieceToBitmask({ color: 'white', type: 'pawn' })).toBe(WHITE | PAWN);
  });
  it('black knight → 10', () => {
    expect(pieceToBitmask({ color: 'black', type: 'knight' })).toBe(
      BLACK | KNIGHT,
    );
  });
  it('white king → 6', () => {
    expect(pieceToBitmask({ color: 'white', type: 'king' })).toBe(WHITE | KING);
  });
  it('black queen → 13', () => {
    expect(pieceToBitmask({ color: 'black', type: 'queen' })).toBe(
      BLACK | QUEEN,
    );
  });
});

describe('bitmaskToPiece', () => {
  it('1 → white pawn', () => {
    expect(bitmaskToPiece(WHITE | PAWN)).toEqual({
      color: 'white',
      type: 'pawn',
    });
  });
  it('10 → black knight', () => {
    expect(bitmaskToPiece(BLACK | KNIGHT)).toEqual({
      color: 'black',
      type: 'knight',
    });
  });
  it('6 → white king', () => {
    expect(bitmaskToPiece(WHITE | KING)).toEqual({
      color: 'white',
      type: 'king',
    });
  });
  it('13 → black queen', () => {
    expect(bitmaskToPiece(BLACK | QUEEN)).toEqual({
      color: 'black',
      type: 'queen',
    });
  });
  it('0 → undefined', () => {
    expect(bitmaskToPiece(0)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `pnpm test -- src/__tests__/board.spec.ts` Expected: FAIL —
`pieceToBitmask`, `bitmaskToPiece`, `indexToSquare`, constants not exported from
`../board.js`

- [ ] **Step 3: Implement bitmask constants and conversion helpers**

Rewrite `src/board.ts`:

```typescript
import type { Color, Piece, PieceType, Square } from './types.js';

const OFF_BOARD = 0x88;

const WHITE = 0;
const BLACK = 8;
const PAWN = 1;
const KNIGHT = 2;
const BISHOP = 3;
const ROOK = 4;
const QUEEN = 5;
const KING = 6;

const TYPE_MASK = 0b0111;
const COLOR_MASK = 0b1000;

const FILES = 'abcdefgh';

function squareToIndex(square: Square): number {
  const file = (square.codePointAt(0) ?? 0) - ('a'.codePointAt(0) ?? 0);
  const rank = Number.parseInt(square[1] ?? '1', 10);
  return (8 - rank) * 16 + file;
}

function indexToSquare(index: number): Square {
  const file = index & 0x07;
  const rank = 8 - ((index >> 4) & 0x07);
  return `${FILES[file]}${rank}` as Square;
}

const PIECE_TYPE_TO_NUM: Record<PieceType, number> = {
  bishop: BISHOP,
  king: KING,
  knight: KNIGHT,
  pawn: PAWN,
  queen: QUEEN,
  rook: ROOK,
};

const NUM_TO_PIECE_TYPE: PieceType[] = [
  'pawn', // never used (index 0 = empty)
  'pawn', // 1
  'knight', // 2
  'bishop', // 3
  'rook', // 4
  'queen', // 5
  'king', // 6
];

function pieceToBitmask(piece: Piece): number {
  return (
    (piece.color === 'black' ? BLACK : WHITE) | PIECE_TYPE_TO_NUM[piece.type]
  );
}

function bitmaskToPiece(value: number): Piece | undefined {
  if (value === 0) {
    return undefined;
  }
  const color: Color = (value & COLOR_MASK) !== 0 ? 'black' : 'white';
  const type = NUM_TO_PIECE_TYPE[value & TYPE_MASK];
  if (type === undefined) {
    return undefined;
  }
  return { color, type };
}

export {
  BISHOP,
  BLACK,
  COLOR_MASK,
  KING,
  KNIGHT,
  OFF_BOARD,
  PAWN,
  QUEEN,
  ROOK,
  TYPE_MASK,
  WHITE,
  bitmaskToPiece,
  indexToSquare,
  pieceToBitmask,
  squareToIndex,
};
```

Note: `boardFromMap` is removed — its logic moves into the Position constructor.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/__tests__/board.spec.ts` Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `pnpm test` Expected: Some position tests may fail because `boardFromMap`
was removed. That's expected — Task 2 will fix the Position class.

Actually — don't remove `boardFromMap` yet. Keep it for now so existing Position
code still compiles. Add it to the exports. We'll remove it in Task 2 when
Position no longer needs it.

Update: keep `boardFromMap` in `board.ts` and in the exports. Add all the new
exports alongside it.

- [ ] **Step 6: Run full test suite**

Run: `pnpm test` Expected: All 93 tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add bitmask constants and conversion helpers to board module"
```

---

### Task 2: Rewrite Position internals to use bitmask 0x88 array

**Files:**

- Modify: `src/position.ts`

This is the core task. Rewrite the entire Position class internals while keeping
the public API identical. The complete new `position.ts`:

- [ ] **Step 1: Rewrite `src/position.ts`**

Replace the entire file with:

```typescript
import {
  BLACK,
  BISHOP,
  COLOR_MASK,
  KING,
  KNIGHT,
  OFF_BOARD,
  PAWN,
  QUEEN,
  ROOK,
  TYPE_MASK,
  WHITE,
  bitmaskToPiece,
  indexToSquare,
  pieceToBitmask,
  squareToIndex,
} from './board.js';
import {
  BISHOP_MOVES,
  KING_MOVES,
  KNIGHT_MOVES,
  PAWN_MOVES,
  ROOK_MOVES,
} from './moves.js';
import { squareColor } from './squares.js';
import { castlingHash, epHash, pieceHash, turnHash } from './zobrist.js';

import type {
  CastlingRights,
  Color,
  DeriveOptions,
  EnPassantSquare,
  File,
  Piece,
  PieceMove,
  PieceType,
  PositionOptions,
  Square,
} from './types.js';

const DEFAULT_OPTIONS: Required<Omit<PositionOptions, 'enPassantSquare'>> &
  Pick<PositionOptions, 'enPassantSquare'> = {
  castlingRights: {
    black: { king: true, queen: true },
    white: { king: true, queen: true },
  },
  enPassantSquare: undefined,
  fullmoveNumber: 1,
  halfmoveClock: 0,
  turn: 'white',
};

const NUM_TO_PIECE_TYPE: PieceType[] = [
  'pawn',
  'pawn',
  'knight',
  'bishop',
  'rook',
  'queen',
  'king',
];

const NUM_TO_COLOR: Color[] = [
  'white',
  'white',
  'white',
  'white',
  'white',
  'white',
  'white',
  'white',
  'black',
];

export class Position {
  readonly castlingRights: CastlingRights;
  readonly enPassantSquare: EnPassantSquare | undefined;
  readonly fullmoveNumber: number;
  readonly halfmoveClock: number;
  readonly turn: Color;

  #board: number[];
  #hash: string | undefined;
  #isCheck: boolean | undefined;

  constructor(board?: Map<Square, Piece>, options?: PositionOptions) {
    this.#board = new Array<number>(128).fill(0);

    if (board !== undefined) {
      for (const [square, piece] of board) {
        this.#board[squareToIndex(square)] = pieceToBitmask(piece);
      }
    }

    const options_ = { ...DEFAULT_OPTIONS, ...options };
    this.castlingRights = options_.castlingRights;
    this.enPassantSquare = options_.enPassantSquare;
    this.fullmoveNumber = options_.fullmoveNumber;
    this.halfmoveClock = options_.halfmoveClock;
    this.turn = options_.turn;
  }

  static #from(
    board: number[],
    options: {
      castlingRights: CastlingRights;
      enPassantSquare: EnPassantSquare | undefined;
      fullmoveNumber: number;
      halfmoveClock: number;
      turn: Color;
    },
  ): Position {
    const pos = Object.create(Position.prototype) as Position;
    pos.#board = board;
    pos.#hash = undefined;
    pos.#isCheck = undefined;
    Object.defineProperty(pos, 'castlingRights', {
      configurable: false,
      enumerable: true,
      value: options.castlingRights,
      writable: false,
    });
    Object.defineProperty(pos, 'enPassantSquare', {
      configurable: false,
      enumerable: true,
      value: options.enPassantSquare,
      writable: false,
    });
    Object.defineProperty(pos, 'fullmoveNumber', {
      configurable: false,
      enumerable: true,
      value: options.fullmoveNumber,
      writable: false,
    });
    Object.defineProperty(pos, 'halfmoveClock', {
      configurable: false,
      enumerable: true,
      value: options.halfmoveClock,
      writable: false,
    });
    Object.defineProperty(pos, 'turn', {
      configurable: false,
      enumerable: true,
      value: options.turn,
      writable: false,
    });
    return pos;
  }

  get hash(): string {
    if (this.#hash !== undefined) {
      return this.#hash;
    }

    let h = 0n;

    for (let i = 0; i < 128; i++) {
      if (i & OFF_BOARD) {
        i += 7;
        continue;
      }
      const value = this.#board[i]!;
      if (value === 0) {
        continue;
      }
      const sq = indexToSquare(i);
      const type = NUM_TO_PIECE_TYPE[value & TYPE_MASK]!;
      const color: Color = (value & COLOR_MASK) !== 0 ? 'black' : 'white';
      h ^= pieceHash(sq, type, color);
    }

    h ^= turnHash(this.turn);

    for (const [color, sides] of Object.entries(this.castlingRights) as [
      Color,
      { king: boolean; queen: boolean },
    ][]) {
      for (const [side, active] of Object.entries(sides) as [
        'king' | 'queen',
        boolean,
      ][]) {
        if (active) {
          h ^= castlingHash(color, side);
        }
      }
    }

    if (this.enPassantSquare !== undefined) {
      const file = this.enPassantSquare[0] as File;
      h ^= epHash(file);
    }

    this.#hash = h.toString(16).padStart(16, '0');
    return this.#hash;
  }

  get isInsufficientMaterial(): boolean {
    const nonKingPieces: { index: number; type: number }[] = [];

    for (let i = 0; i < 128; i++) {
      if (i & OFF_BOARD) {
        i += 7;
        continue;
      }
      const value = this.#board[i]!;
      if (value === 0) {
        continue;
      }
      const type = value & TYPE_MASK;
      if (type !== KING) {
        nonKingPieces.push({ index: i, type });
      }
    }

    if (nonKingPieces.length === 0) {
      return true;
    }

    if (nonKingPieces.length === 1) {
      const type = nonKingPieces[0]!.type;
      return type === BISHOP || type === KNIGHT;
    }

    const allBishops = nonKingPieces.every((p) => p.type === BISHOP);
    if (allBishops) {
      const firstSq = indexToSquare(nonKingPieces[0]!.index);
      const firstColor = squareColor(firstSq);
      return nonKingPieces.every(
        (p) => squareColor(indexToSquare(p.index)) === firstColor,
      );
    }

    return false;
  }

  get isValid(): boolean {
    let blackKings = 0;
    let whiteKings = 0;

    for (let i = 0; i < 128; i++) {
      if (i & OFF_BOARD) {
        i += 7;
        continue;
      }
      const value = this.#board[i]!;
      if (value === 0) {
        continue;
      }
      const type = value & TYPE_MASK;

      if (type === KING) {
        if ((value & COLOR_MASK) !== 0) {
          blackKings++;
        } else {
          whiteKings++;
        }
      }

      if (type === PAWN) {
        const rank = 8 - ((i >> 4) & 0x07);
        if (rank === 1 || rank === 8) {
          return false;
        }
      }
    }

    if (blackKings !== 1 || whiteKings !== 1) {
      return false;
    }

    const opponentColor = this.turn === 'white' ? BLACK : WHITE;
    const opponentKingBitmask = opponentColor | KING;
    let opponentKingIndex = -1;
    for (let i = 0; i < 128; i++) {
      if (i & OFF_BOARD) {
        i += 7;
        continue;
      }
      if (this.#board[i] === opponentKingBitmask) {
        opponentKingIndex = i;
        break;
      }
    }

    if (opponentKingIndex === -1) {
      return false;
    }

    return !this.#isAttackedBy(
      opponentKingIndex,
      this.turn === 'white' ? WHITE : BLACK,
    );
  }

  get isCheck(): boolean {
    if (this.#isCheck !== undefined) {
      return this.#isCheck;
    }

    const myColor = this.turn === 'white' ? WHITE : BLACK;
    const myKingBitmask = myColor | KING;
    let kingIndex = -1;
    for (let i = 0; i < 128; i++) {
      if (i & OFF_BOARD) {
        i += 7;
        continue;
      }
      if (this.#board[i] === myKingBitmask) {
        kingIndex = i;
        break;
      }
    }

    this.#isCheck =
      kingIndex !== -1 &&
      this.#isAttackedBy(kingIndex, myColor === WHITE ? BLACK : WHITE);
    return this.#isCheck;
  }

  #isAttackedBy(targetIndex: number, byColor: number): boolean {
    const enemyKnight = byColor | KNIGHT;
    for (const move of KNIGHT_MOVES) {
      const i = targetIndex + move.offset;
      if (!(i & OFF_BOARD) && this.#board[i] === enemyKnight) {
        return true;
      }
    }

    const enemyRook = byColor | ROOK;
    const enemyQueen = byColor | QUEEN;
    for (const move of ROOK_MOVES) {
      let i = targetIndex + move.offset;
      while (!(i & OFF_BOARD)) {
        const value = this.#board[i]!;
        if (value !== 0) {
          if (value === enemyRook || value === enemyQueen) {
            return true;
          }
          break;
        }
        i += move.offset;
      }
    }

    const enemyBishop = byColor | BISHOP;
    for (const move of BISHOP_MOVES) {
      let i = targetIndex + move.offset;
      while (!(i & OFF_BOARD)) {
        const value = this.#board[i]!;
        if (value !== 0) {
          if (value === enemyBishop || value === enemyQueen) {
            return true;
          }
          break;
        }
        i += move.offset;
      }
    }

    const enemyKing = byColor | KING;
    for (const move of KING_MOVES) {
      const i = targetIndex + move.offset;
      if (!(i & OFF_BOARD) && this.#board[i] === enemyKing) {
        return true;
      }
    }

    const pawnMoves =
      byColor === BLACK ? PAWN_MOVES.black.captures : PAWN_MOVES.white.captures;
    const enemyPawn = byColor | PAWN;
    for (const move of pawnMoves) {
      const i = targetIndex + move.offset;
      if (!(i & OFF_BOARD) && this.#board[i] === enemyPawn) {
        return true;
      }
    }

    return false;
  }

  derive(changes?: DeriveOptions): Position {
    const board = [...this.#board];

    if (changes?.changes) {
      for (const [square, piece] of changes.changes) {
        const index = squareToIndex(square);
        board[index] = piece === undefined ? 0 : pieceToBitmask(piece);
      }
    }

    return Position.#from(board, {
      castlingRights: changes?.castlingRights ?? this.castlingRights,
      enPassantSquare:
        'enPassantSquare' in (changes ?? {})
          ? changes?.enPassantSquare
          : this.enPassantSquare,
      fullmoveNumber: changes?.fullmoveNumber ?? this.fullmoveNumber,
      halfmoveClock: changes?.halfmoveClock ?? this.halfmoveClock,
      turn: changes?.turn ?? this.turn,
    });
  }

  reach(square: Square, move: PieceMove): Square[] {
    const fromIndex = squareToIndex(square);
    let index = fromIndex + move.offset;

    if ((index & OFF_BOARD) !== 0) {
      return [];
    }

    if (!move.slide) {
      return [indexToSquare(index)];
    }

    const result: Square[] = [];

    while ((index & OFF_BOARD) === 0) {
      result.push(indexToSquare(index));

      if (this.#board[index] !== 0) {
        break;
      }

      index += move.offset;
    }

    return result;
  }

  piece(square: Square): Piece | undefined {
    return bitmaskToPiece(this.#board[squareToIndex(square)]!);
  }

  pieces(color?: Color): Map<Square, Piece> {
    const result = new Map<Square, Piece>();
    const colorFilter =
      color === undefined ? undefined : color === 'black' ? BLACK : WHITE;

    for (let i = 0; i < 128; i++) {
      if (i & OFF_BOARD) {
        i += 7;
        continue;
      }
      const value = this.#board[i]!;
      if (value === 0) {
        continue;
      }
      if (colorFilter !== undefined && (value & COLOR_MASK) !== colorFilter) {
        continue;
      }
      const piece = bitmaskToPiece(value);
      if (piece !== undefined) {
        result.set(indexToSquare(i), piece);
      }
    }

    return result;
  }
}
```

- [ ] **Step 2: Run full test suite**

Run: `pnpm test` Expected: All 93 tests pass. The public API is unchanged — all
existing tests should work as-is.

- [ ] **Step 3: Run lint**

Run: `pnpm lint` Expected: PASS. May need minor adjustments for sort-keys or
import ordering.

- [ ] **Step 4: Commit**

```bash
git add src/position.ts
git commit -m "refactor: rewrite Position internals to bitmask 0x88 array"
```

---

### Task 3: Remove `boardFromMap` and clean up `board.ts`

**Files:**

- Modify: `src/board.ts`

- [ ] **Step 1: Remove `boardFromMap` from `board.ts`**

Delete the `boardFromMap` function and remove it from the exports. It's no
longer used — Position now does its own Map-to-array conversion in the
constructor.

- [ ] **Step 2: Run tests and lint**

Run: `pnpm test && pnpm lint` Expected: PASS — nothing imports `boardFromMap`
anymore.

- [ ] **Step 3: Commit**

```bash
git add src/board.ts
git commit -m "refactor: remove boardFromMap, no longer needed"
```

---

### Task 4: Remove `indexToSquare` from `position.ts` file-private scope

**Files:**

- Modify: `src/position.ts`

- [ ] **Step 1: Verify `indexToSquare` is no longer defined in `position.ts`**

The Task 2 rewrite already uses `indexToSquare` from `./board.js` and doesn't
define its own. Verify by checking the file — if the file-private
`indexToSquare` and `FILES` constant are still there, remove them. The import
from `./board.js` already provides `indexToSquare`.

- [ ] **Step 2: Also remove the duplicate `NUM_TO_PIECE_TYPE` and `NUM_TO_COLOR`
      from position.ts if present**

These are only needed inside `board.ts` for `bitmaskToPiece`. If Task 2's
rewrite included them in `position.ts` for the `hash` getter, check if they can
be replaced by calling `bitmaskToPiece` instead. The `hash` getter iterates the
board and needs square, type, and color — it can use `bitmaskToPiece` to get a
`Piece` object, then read `.type` and `.color`.

Update the `hash` getter loop:

```typescript
for (let i = 0; i < 128; i++) {
  if (i & OFF_BOARD) {
    i += 7;
    continue;
  }
  const value = this.#board[i]!;
  if (value === 0) {
    continue;
  }
  const p = bitmaskToPiece(value);
  if (p !== undefined) {
    h ^= pieceHash(indexToSquare(i), p.type, p.color);
  }
}
```

This removes the need for `NUM_TO_PIECE_TYPE` and `NUM_TO_COLOR` in
`position.ts`.

- [ ] **Step 3: Run tests and lint**

Run: `pnpm test && pnpm lint` Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/position.ts
git commit -m "refactor: clean up position.ts, remove duplicate helpers"
```

---

### Task 5: Update CHANGELOG

**Files:**

- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add entries to the existing `## [3.0.0]` section**

Under `### Changed`, add:

```markdown
- Position internals rewritten to use bitmask 0x88 array as single source of
  truth. `Map<Square, Piece>` no longer stored internally.
- `castlingRights`, `enPassantSquare`, `fullmoveNumber`, `halfmoveClock`, and
  `turn` are now public readonly fields instead of getters.
```

- [ ] **Step 2: Run lint and format**

Run: `pnpm lint && pnpm format` Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG with bitmask board refactor"
```
