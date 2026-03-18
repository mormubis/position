# Production-Ready Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Make `@echecs/position` production-ready by replacing the `Position`
interface + standalone functions with an immutable `Position` class, adding
missing query APIs, and wiring up CI/CD, README, and LICENSE for npm publishing.

**Architecture:** The `Position` class encapsulates board data as private state
and exposes all queries as getters and methods. Standalone query functions in
`src/queries.ts` are removed — their logic moves into the class. The 0x88
internal utilities remain unchanged in `src/internal/`.

**Tech Stack:** TypeScript, Vitest, ESLint, Prettier, TypeDoc, GitHub Actions,
pnpm

---

## Task 1: Add `LICENSE` file

**Files:**

- Create: `LICENSE`

**Step 1: Create the MIT LICENSE file**

```
MIT License

Copyright (c) 2026 Adrian de la Rosa

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Step 2: Commit**

```bash
git add LICENSE
git commit -m "chore: add MIT license"
```

---

## Task 2: Add runtime constants

**Files:**

- Modify: `src/constants.ts`
- Modify: `src/index.ts`
- Modify: `src/__tests__/constants.spec.ts`

**Step 1: Read the existing constants spec to understand what's tested**

Open `src/__tests__/constants.spec.ts`.

**Step 2: Write failing tests for the new constants**

Add to `src/__tests__/constants.spec.ts`:

```ts
import { COLORS, FILES, PIECE_TYPES, RANKS, SQUARES } from '../constants.js';

describe('COLORS', () => {
  it('contains both colors', () => {
    expect(COLORS).toEqual(['b', 'w']);
  });
});

describe('FILES', () => {
  it('contains all 8 files in order', () => {
    expect(FILES).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  });
});

describe('RANKS', () => {
  it('contains all 8 ranks in order', () => {
    expect(RANKS).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });
});

describe('PIECE_TYPES', () => {
  it('contains all 6 piece types', () => {
    expect(PIECE_TYPES).toEqual(['b', 'k', 'n', 'p', 'q', 'r']);
  });
});

describe('SQUARES', () => {
  it('contains all 64 squares', () => {
    expect(SQUARES).toHaveLength(64);
  });

  it('starts with a8 and ends with h1', () => {
    expect(SQUARES[0]).toBe('a8');
    expect(SQUARES[63]).toBe('h1');
  });
});
```

**Step 3: Run tests to verify they fail**

```bash
pnpm test
```

Expected: FAIL — `COLORS`, `FILES`, `RANKS`, `PIECE_TYPES`, `SQUARES` not
exported.

**Step 4: Add constants to `src/constants.ts`**

Add after the existing imports and before `EMPTY_BOARD`:

```ts
import type { Color, File, PieceType, Rank, Square } from './types.js';

export const COLORS: Color[] = ['b', 'w'];
export const FILES: File[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS: Rank[] = ['1', '2', '3', '4', '5', '6', '7', '8'];
export const PIECE_TYPES: PieceType[] = ['b', 'k', 'n', 'p', 'q', 'r'];
export const SQUARES: Square[] = FILES.flatMap((f) =>
  [...RANKS].reverse().map((r) => `${f}${r}` as Square),
);
```

**Step 5: Export from `src/index.ts`**

Add `COLORS, FILES, PIECE_TYPES, RANKS, SQUARES` to the export from
`./constants.js`.

**Step 6: Run tests to verify they pass**

```bash
pnpm test
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/constants.ts src/index.ts src/__tests__/constants.spec.ts
git commit -m "feat: add runtime constants COLORS, FILES, RANKS, PIECE_TYPES, SQUARES"
```

---

## Task 3: Create the `Position` class — construction

**Files:**

- Create: `src/position.ts`
- Create: `src/__tests__/position.spec.ts`

**Step 1: Write failing tests for construction**

Create `src/__tests__/position.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { Position } from '../position.js';

import type { Piece, Square } from '../types.js';

describe('Position constructor', () => {
  it('defaults to starting position with no args', () => {
    const pos = new Position();
    expect(pos.turn).toBe('w');
    expect(pos.halfmoveClock).toBe(0);
    expect(pos.fullmoveNumber).toBe(1);
    expect(pos.castlingRights).toEqual({
      bK: true,
      bQ: true,
      wK: true,
      wQ: true,
    });
    expect(pos.enPassantSquare).toBeUndefined();
  });

  it('starting position has 32 pieces', () => {
    const pos = new Position();
    expect(pos.pieces().size).toBe(32);
  });

  it('accepts a custom board', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'k' }],
    ]);
    const pos = new Position(board);
    expect(pos.pieces().size).toBe(2);
    expect(pos.turn).toBe('w');
  });

  it('accepts options to override defaults', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'k' }],
    ]);
    const pos = new Position(board, {
      turn: 'b',
      halfmoveClock: 5,
      fullmoveNumber: 10,
      castlingRights: { bK: false, bQ: false, wK: false, wQ: false },
      enPassantSquare: 'e3',
    });
    expect(pos.turn).toBe('b');
    expect(pos.halfmoveClock).toBe(5);
    expect(pos.fullmoveNumber).toBe(10);
    expect(pos.castlingRights).toEqual({
      bK: false,
      bQ: false,
      wK: false,
      wQ: false,
    });
    expect(pos.enPassantSquare).toBe('e3');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test
```

Expected: FAIL — `Position` not found.

**Step 3: Create `src/position.ts` with the constructor and getters**

```ts
import { STARTING_CASTLING, startingBoard } from './constants.js';

import type { CastlingRights, Color, Piece, Square } from './types.js';

interface PositionOptions {
  castlingRights?: CastlingRights;
  enPassantSquare?: Square;
  fullmoveNumber?: number;
  halfmoveClock?: number;
  turn?: Color;
}

const DEFAULT_OPTIONS: Required<PositionOptions> = {
  castlingRights: { bK: true, bQ: true, wK: true, wQ: true },
  enPassantSquare: undefined,
  fullmoveNumber: 1,
  halfmoveClock: 0,
  turn: 'w',
};

export class Position {
  readonly #board: Map<Square, Piece>;
  readonly #castlingRights: CastlingRights;
  readonly #enPassantSquare: Square | undefined;
  readonly #fullmoveNumber: number;
  readonly #halfmoveClock: number;
  readonly #turn: Color;

  constructor(board?: Map<Square, Piece>, options?: PositionOptions) {
    this.#board = new Map(board ?? startingBoard);
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.#castlingRights = opts.castlingRights;
    this.#enPassantSquare = opts.enPassantSquare;
    this.#fullmoveNumber = opts.fullmoveNumber;
    this.#halfmoveClock = opts.halfmoveClock;
    this.#turn = opts.turn;
  }

  get castlingRights(): CastlingRights {
    return this.#castlingRights;
  }

  get enPassantSquare(): Square | undefined {
    return this.#enPassantSquare;
  }

  get fullmoveNumber(): number {
    return this.#fullmoveNumber;
  }

  get halfmoveClock(): number {
    return this.#halfmoveClock;
  }

  get turn(): Color {
    return this.#turn;
  }
}
```

Note: `src/constants.ts` needs to export `startingBoard` and `STARTING_CASTLING`
— refactor those to named exports.

**Step 4: Run tests to verify they pass**

```bash
pnpm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/position.ts src/__tests__/position.spec.ts src/constants.ts
git commit -m "feat: add Position class with constructor and getters"
```

---

## Task 4: Add `piece`, `pieces`, `findPiece` methods

**Files:**

- Modify: `src/position.ts`
- Modify: `src/__tests__/position.spec.ts`

**Step 1: Write failing tests**

Add to `src/__tests__/position.spec.ts`:

```ts
describe('piece', () => {
  it('returns piece on occupied square', () => {
    const pos = new Position();
    expect(pos.piece('e1')).toEqual({ color: 'w', type: 'k' });
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
    expect(pos.pieces('w').size).toBe(16);
  });

  it('returns 16 black pieces', () => {
    const pos = new Position();
    expect(pos.pieces('b').size).toBe(16);
  });
});

describe('findPiece', () => {
  it('returns squares with matching piece', () => {
    const pos = new Position();
    const squares = pos.findPiece({ color: 'w', type: 'r' });
    expect(squares).toHaveLength(2);
    expect(squares).toContain('a1');
    expect(squares).toContain('h1');
  });

  it('returns empty array when piece not found', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'k' }],
    ]);
    const pos = new Position(board);
    expect(pos.findPiece({ color: 'w', type: 'q' })).toEqual([]);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test
```

Expected: FAIL — methods not defined.

**Step 3: Add methods to `src/position.ts`**

```ts
piece(square: Square): Piece | undefined {
  return this.#board.get(square);
}

pieces(color?: Color): Map<Square, Piece> {
  if (color === undefined) {
    return new Map(this.#board);
  }
  const result = new Map<Square, Piece>();
  for (const [sq, p] of this.#board) {
    if (p.color === color) {
      result.set(sq, p);
    }
  }
  return result;
}

findPiece(piece: Piece): Square[] {
  const result: Square[] = [];
  for (const [sq, p] of this.#board) {
    if (p.color === piece.color && p.type === piece.type) {
      result.push(sq);
    }
  }
  return result;
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/position.ts src/__tests__/position.spec.ts
git commit -m "feat: add piece, pieces, findPiece methods to Position"
```

---

## Task 5: Add `isAttacked` and `attackers` methods

**Files:**

- Modify: `src/position.ts`
- Modify: `src/__tests__/position.spec.ts`

**Step 1: Write failing tests**

Add to `src/__tests__/position.spec.ts`:

```ts
describe('isAttacked', () => {
  it('returns true when a white pawn attacks the square diagonally', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['d3', { color: 'w', type: 'p' }],
    ]);
    const pos = new Position(board);
    expect(pos.isAttacked('e4', 'w')).toBe(true);
  });

  it('returns false when no piece attacks the square', () => {
    const board = new Map<Square, Piece>([['e1', { color: 'w', type: 'k' }]]);
    const pos = new Position(board);
    expect(pos.isAttacked('e4', 'b')).toBe(false);
  });

  it('returns true when a knight attacks the square', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['f6', { color: 'b', type: 'n' }],
    ]);
    const pos = new Position(board);
    expect(pos.isAttacked('e4', 'b')).toBe(true);
    expect(pos.isAttacked('g4', 'b')).toBe(true);
    expect(pos.isAttacked('a1', 'b')).toBe(false);
  });
});

describe('attackers', () => {
  it('returns squares of pieces attacking the target', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['f6', { color: 'b', type: 'n' }],
      ['g5', { color: 'b', type: 'b' }],
    ]);
    const pos = new Position(board);
    const atk = pos.attackers('e4', 'b');
    expect(atk).toContain('f6');
    expect(atk).toContain('g5');
  });

  it('returns empty array when no attackers', () => {
    const board = new Map<Square, Piece>([['e1', { color: 'w', type: 'k' }]]);
    const pos = new Position(board);
    expect(pos.attackers('e4', 'b')).toEqual([]);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test
```

Expected: FAIL — methods not defined.

**Step 3: Move attack logic from `src/queries.ts` into `src/position.ts`**

Import the internal utilities at the top of `src/position.ts`:

```ts
import {
  ATTACKS,
  DIFF_OFFSET,
  OFF_BOARD,
  PIECE_MASKS,
  RAYS,
  boardFromMap,
  squareToIndex,
} from './internal/index.js';
```

Add private helper and public methods:

```ts
#isAttackedByPiece(
  board: (Piece | undefined)[],
  targetIndex: number,
  fromIndex: number,
  p: Piece,
  by: Color,
): boolean {
  const diff = targetIndex - fromIndex;
  const tableIndex = diff + DIFF_OFFSET;

  if (tableIndex < 0 || tableIndex >= 240) return false;

  const attackMask = ATTACKS[tableIndex] ?? 0;
  const pieceMask = PIECE_MASKS[p.type] ?? 0;

  if ((attackMask & pieceMask) === 0) return false;

  if (p.type === 'p') {
    if (by === 'w' && diff > 0) return false;
    if (by === 'b' && diff < 0) return false;
  }

  const ray = RAYS[tableIndex] ?? 0;
  if (ray === 0) return true;

  let index = fromIndex + ray;
  while (index !== targetIndex) {
    if ((index & OFF_BOARD) !== 0) return false;
    if (board[index] !== undefined) return false;
    index += ray;
  }

  return true;
}

isAttacked(square: Square, by: Color): boolean {
  const board = boardFromMap(this.#board);
  const targetIndex = squareToIndex(square);

  for (const [sq, p] of this.#board) {
    if (p.color !== by) continue;
    const fromIndex = squareToIndex(sq);
    if (this.#isAttackedByPiece(board, targetIndex, fromIndex, p, by)) {
      return true;
    }
  }
  return false;
}

attackers(square: Square, by: Color): Square[] {
  const board = boardFromMap(this.#board);
  const targetIndex = squareToIndex(square);
  const result: Square[] = [];

  for (const [sq, p] of this.#board) {
    if (p.color !== by) continue;
    const fromIndex = squareToIndex(sq);
    if (this.#isAttackedByPiece(board, targetIndex, fromIndex, p, by)) {
      result.push(sq);
    }
  }
  return result;
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/position.ts src/__tests__/position.spec.ts
git commit -m "feat: add isAttacked and attackers methods to Position"
```

---

## Task 6: Add `isCheck` getter

**Files:**

- Modify: `src/position.ts`
- Modify: `src/__tests__/position.spec.ts`

**Step 1: Write failing tests**

Add to `src/__tests__/position.spec.ts`:

```ts
describe('isCheck', () => {
  it('returns false for starting position', () => {
    expect(new Position().isCheck).toBe(false);
  });

  it('returns true when king is attacked by a rook on same file', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'r' }],
    ]);
    const pos = new Position(board, { turn: 'w' });
    expect(pos.isCheck).toBe(true);
  });

  it('returns false when sliding attacker is blocked', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e4', { color: 'w', type: 'p' }],
      ['e8', { color: 'b', type: 'r' }],
    ]);
    const pos = new Position(board, { turn: 'w' });
    expect(pos.isCheck).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test
```

Expected: FAIL — `isCheck` not defined.

**Step 3: Add getter to `src/position.ts`**

```ts
get isCheck(): boolean {
  for (const [square, p] of this.#board) {
    if (p.type === 'k' && p.color === this.#turn) {
      const opponent: Color = this.#turn === 'w' ? 'b' : 'w';
      return this.isAttacked(square, opponent);
    }
  }
  return false;
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/position.ts src/__tests__/position.spec.ts
git commit -m "feat: add isCheck getter to Position"
```

---

## Task 7: Add `isValid` getter

**Files:**

- Modify: `src/position.ts`
- Modify: `src/__tests__/position.spec.ts`

**Step 1: Write failing tests**

Add to `src/__tests__/position.spec.ts`:

```ts
describe('isValid', () => {
  it('returns true for starting position', () => {
    expect(new Position().isValid).toBe(true);
  });

  it('returns false when white king is missing', () => {
    const board = new Map<Square, Piece>([['e8', { color: 'b', type: 'k' }]]);
    expect(new Position(board).isValid).toBe(false);
  });

  it('returns false when black king is missing', () => {
    const board = new Map<Square, Piece>([['e1', { color: 'w', type: 'k' }]]);
    expect(new Position(board).isValid).toBe(false);
  });

  it('returns false when a pawn is on rank 1', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'k' }],
      ['a1', { color: 'w', type: 'p' }],
    ]);
    expect(new Position(board).isValid).toBe(false);
  });

  it('returns false when a pawn is on rank 8', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'k' }],
      ['a8', { color: 'b', type: 'p' }],
    ]);
    expect(new Position(board).isValid).toBe(false);
  });

  it('returns false when the side not to move is in check', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'k' }],
      ['e2', { color: 'w', type: 'r' }],
    ]);
    // It is white's turn, but black king is in check from white rook — invalid
    const pos = new Position(board, { turn: 'w' });
    expect(pos.isValid).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test
```

Expected: FAIL — `isValid` not defined.

**Step 3: Add getter to `src/position.ts`**

```ts
get isValid(): boolean {
  // Must have exactly one king per color
  let whiteKings = 0;
  let blackKings = 0;

  for (const [square, p] of this.#board) {
    if (p.type === 'k') {
      if (p.color === 'w') whiteKings++;
      else blackKings++;
    }

    // No pawns on rank 1 or 8
    if (p.type === 'p' && (square[1] === '1' || square[1] === '8')) {
      return false;
    }
  }

  if (whiteKings !== 1 || blackKings !== 1) return false;

  // Side not to move must not be in check
  const opponent: Color = this.#turn === 'w' ? 'b' : 'w';
  for (const [square, p] of this.#board) {
    if (p.type === 'k' && p.color === opponent) {
      if (this.isAttacked(square, this.#turn)) return false;
    }
  }

  return true;
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/position.ts src/__tests__/position.spec.ts
git commit -m "feat: add isValid getter to Position"
```

---

## Task 8: Add `isInsufficientMaterial` getter

**Files:**

- Modify: `src/position.ts`
- Modify: `src/__tests__/position.spec.ts`

**Step 1: Write failing tests**

Add to `src/__tests__/position.spec.ts`:

```ts
describe('isInsufficientMaterial', () => {
  it('returns false for starting position', () => {
    expect(new Position().isInsufficientMaterial).toBe(false);
  });

  it('returns true for K vs K', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'k' }],
    ]);
    expect(new Position(board).isInsufficientMaterial).toBe(true);
  });

  it('returns true for K vs KB', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'k' }],
      ['c1', { color: 'w', type: 'b' }],
    ]);
    expect(new Position(board).isInsufficientMaterial).toBe(true);
  });

  it('returns true for K vs KN', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'k' }],
      ['c1', { color: 'b', type: 'n' }],
    ]);
    expect(new Position(board).isInsufficientMaterial).toBe(true);
  });

  it('returns false for K vs KR', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'k' }],
      ['a1', { color: 'w', type: 'r' }],
    ]);
    expect(new Position(board).isInsufficientMaterial).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test
```

Expected: FAIL — `isInsufficientMaterial` not defined.

**Step 3: Add getter to `src/position.ts`**

```ts
get isInsufficientMaterial(): boolean {
  const nonKing: Piece[] = [];
  for (const p of this.#board.values()) {
    if (p.type !== 'k') nonKing.push(p);
  }

  // K vs K
  if (nonKing.length === 0) return true;

  // K vs KB or K vs KN
  if (nonKing.length === 1) {
    return nonKing[0]!.type === 'b' || nonKing[0]!.type === 'n';
  }

  return false;
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/position.ts src/__tests__/position.spec.ts
git commit -m "feat: add isInsufficientMaterial getter to Position"
```

---

## Task 9: Add `hash` getter (Zobrist)

**Files:**

- Modify: `src/position.ts`
- Create: `src/internal/zobrist.ts`
- Modify: `src/internal/index.ts`
- Modify: `src/__tests__/position.spec.ts`

**Step 1: Write failing tests**

Add to `src/__tests__/position.spec.ts`:

```ts
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
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'k' }],
    ]);
    const pos2 = new Position(board);
    expect(pos1.hash).not.toBe(pos2.hash);
  });

  it('returns different hashes for different turns', () => {
    const board = new Map<Square, Piece>([
      ['e1', { color: 'w', type: 'k' }],
      ['e8', { color: 'b', type: 'k' }],
    ]);
    const posW = new Position(board, { turn: 'w' });
    const posB = new Position(board, { turn: 'b' });
    expect(posW.hash).not.toBe(posB.hash);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test
```

Expected: FAIL — `hash` not defined.

**Step 3: Create `src/internal/zobrist.ts`**

```ts
import type { Color, File, PieceType, Square } from '../types.js';

// Seeded LCG for deterministic random numbers (no Math.random — must be stable across runs)
function lcg(seed: number): () => bigint {
  let s = BigInt(seed);
  return () => {
    s =
      (s * 6_364_136_223_846_793_005n + 1_442_695_040_888_963_407n) &
      0xffff_ffff_ffff_ffffn;
    return s;
  };
}

const next = lcg(0xdeadbeef);

const COLORS: Color[] = ['b', 'w'];
const FILES: File[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;
const PIECE_TYPES: PieceType[] = ['b', 'k', 'n', 'p', 'q', 'r'];
const SQUARES: Square[] = FILES.flatMap((f) =>
  [...RANKS].reverse().map((r) => `${f}${r}` as Square),
);

// Piece table: PIECE_TABLE[square][pieceType][color]
export const PIECE_TABLE: Record<
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

export const TURN_TABLE: Record<Color, bigint> = {
  b: next(),
  w: next(),
};

export const CASTLING_TABLE: Record<string, bigint> = {
  bK: next(),
  bQ: next(),
  wK: next(),
  wQ: next(),
};

export const EP_TABLE: Record<File, bigint> = Object.fromEntries(
  FILES.map((f) => [f, next()]),
) as Record<File, bigint>;
```

**Step 4: Export from `src/internal/index.ts`**

Add:

```ts
export {
  CASTLING_TABLE,
  EP_TABLE,
  PIECE_TABLE,
  TURN_TABLE,
} from './zobrist.js';
```

**Step 5: Add `hash` getter to `src/position.ts`**

Import the Zobrist tables:

```ts
import {
  CASTLING_TABLE,
  EP_TABLE,
  PIECE_TABLE,
  TURN_TABLE,
} from './internal/index.js';
```

Add private field and getter:

```ts
#hash: string | undefined;

get hash(): string {
  if (this.#hash !== undefined) return this.#hash;

  let h = 0n;

  for (const [sq, p] of this.#board) {
    h ^= PIECE_TABLE[sq]?.[p.type]?.[p.color] ?? 0n;
  }

  h ^= TURN_TABLE[this.#turn];

  for (const [right, active] of Object.entries(this.#castlingRights) as [string, boolean][]) {
    if (active) h ^= CASTLING_TABLE[right] ?? 0n;
  }

  if (this.#enPassantSquare !== undefined) {
    const file = this.#enPassantSquare[0] as File;
    h ^= EP_TABLE[file];
  }

  this.#hash = h.toString(16).padStart(16, '0');
  return this.#hash;
}
```

**Step 6: Run tests to verify they pass**

```bash
pnpm test
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/position.ts src/internal/zobrist.ts src/internal/index.ts src/__tests__/position.spec.ts
git commit -m "feat: add Zobrist hash getter to Position"
```

---

## Task 10: Wire up `Position` class to public exports, replace interface

**Files:**

- Modify: `src/types.ts`
- Modify: `src/index.ts`
- Modify: `src/constants.ts`
- Delete: `src/queries.ts`
- Modify: `src/__tests__/queries.spec.ts` (delete or migrate)

**Step 1: Update `src/types.ts`**

Remove the `Position` interface. Keep all other types. Remove `Position` from
the export list.

**Step 2: Update `src/constants.ts`**

Replace:

```ts
export const STARTING_POSITION: Position = { ... }
```

With:

```ts
import { Position } from './position.js';
export const STARTING_POSITION = new Position();
```

**Step 3: Update `src/index.ts`**

- Remove: `export type { Position }` (it's now a class, not a type)
- Remove: `export { isAttacked, isCheck, piece, pieces } from './queries.js'`
- Add: `export { Position } from './position.js'`
- Keep all other exports

**Step 4: Delete `src/queries.ts`**

```bash
rm src/queries.ts
```

**Step 5: Migrate `src/__tests__/queries.spec.ts`**

The tests in `queries.spec.ts` are now covered by `position.spec.ts`. Delete the
old file:

```bash
rm src/__tests__/queries.spec.ts
```

**Step 6: Run full check**

```bash
pnpm lint && pnpm test && pnpm build
```

Expected: all pass.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: replace Position interface with class, wire up public exports"
```

---

## Task 11: Add GitHub Actions workflows

**Files:**

- Create: `.github/workflows/auto-merge.yml`
- Create: `.github/workflows/docs.yml`
- Create: `.github/workflows/format.yml`
- Create: `.github/workflows/lint.yml`
- Create: `.github/workflows/release.yml`
- Create: `.github/workflows/test.yml`

Copy the workflows exactly from a sibling package (e.g.
`../elo/.github/workflows/`). They are identical across the monorepo.

```bash
mkdir -p .github/workflows
cp ../elo/.github/workflows/*.yml .github/workflows/
```

**Step 2: Verify they look correct**

```bash
ls .github/workflows/
```

Expected: `auto-merge.yml docs.yml format.yml lint.yml release.yml test.yml`

**Step 3: Commit**

```bash
git add .github/
git commit -m "ci: add GitHub Actions workflows matching sibling packages"
```

---

## Task 12: Add `README.md`

**Files:**

- Create: `README.md`

**Step 1: Create README**

Model the structure on `../elo/README.md`. Include:

- Badges: npm version, test status, coverage, license, API docs
- One-paragraph description
- Installation (`npm install @echecs/position`)
- Quick start showing `new Position()` and key methods
- API section covering constructor, getters, and methods

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Task 13: Final verification

**Step 1: Run full pre-PR check**

```bash
pnpm lint && pnpm test && pnpm build
```

Expected: all pass, no warnings.

**Step 2: Check package files**

```bash
ls LICENSE README.md CHANGELOG.md
```

Expected: all present.

**Step 3: Verify exports compile correctly**

```bash
node --input-type=module <<'EOF'
import { Position, SQUARES, COLORS } from './dist/index.js'
const pos = new Position()
console.log(pos.turn, pos.isCheck, pos.hash)
console.log(SQUARES.length, COLORS)
EOF
```

Expected: `w false <hash> 64 [ 'b', 'w' ]`
