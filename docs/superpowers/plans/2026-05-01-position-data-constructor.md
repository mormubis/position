# Position single-object constructor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `Position(board?, options?)` constructor with
`Position(data?: PositionData)` so that `new Position(parse(fen))` works
directly.

**Architecture:** Rename `PositionOptions` to `PositionData` (adding `board`
field), change the constructor to accept a single optional object, update
`DeriveOptions` to extend `Omit<PositionData, 'board'>`, and migrate all call
sites (tests, constants usage, README).

**Tech Stack:** TypeScript, Vitest

---

### Task 1: Rename `PositionOptions` to `PositionData` and add `board` field

**Files:**

- Modify: `src/types.ts:55-73` (rename interface, add board field)
- Modify: `src/types.ts:43-49` (update DeriveOptions extends clause)
- Modify: `src/types.ts:104-119` (update export list)

- [ ] **Step 1: Rename `PositionOptions` to `PositionData` and add `board`**

In `src/types.ts`, replace the `PositionOptions` interface with:

```ts
/**
 * Plain-data representation of a chess position. All fields are optional —
 * omitted fields use defaults (standard starting position values).
 */
interface PositionData {
  /** Piece placement as a map from square to piece. Defaults to an empty board. */
  board?: ReadonlyMap<Square, Piece>;
  /** Castling availability. Defaults to all four castling moves available. */
  castlingRights?: CastlingRights;
  /** En passant target square, if any. */
  enPassantSquare?: EnPassantSquare;
  /**
   * Game turn counter — starts at `1` and increments after each black move.
   * After `1. e4 e5 2. Nf3` the fullmove number is `2`. Defaults to `1`.
   */
  fullmoveNumber?: number;
  /**
   * Number of half-moves since the last pawn advance or capture. Resets to
   * `0` on every pawn move or capture. When it reaches `100` (50 full moves
   * per side) either player may claim a draw. Defaults to `0`.
   */
  halfmoveClock?: number;
  /** Side to move. Defaults to `'white'`. */
  turn?: Color;
}
```

- [ ] **Step 2: Update `DeriveOptions` to extend `Omit<PositionData, 'board'>`**

In `src/types.ts`, replace:

```ts
interface DeriveOptions extends PositionOptions {
```

with:

```ts
interface DeriveOptions extends Omit<PositionData, 'board'> {
```

Update the JSDoc to reference `PositionData` instead of `PositionOptions`:

```ts
/**
 * Options accepted by {@link Position.derive}. Extends
 * {@link PositionData} (minus `board`) with a `changes` field for applying
 * piece changes.
 */
```

- [ ] **Step 3: Update the export list**

In `src/types.ts`, replace `PositionOptions` with `PositionData` in the export
block:

```ts
export type {
  CastlingRights,
  Color,
  DeriveOptions,
  EnPassantSquare,
  File,
  Move,
  Piece,
  PieceMove,
  PieceType,
  PositionData,
  PromotionPieceType,
  Rank,
  SideCastlingRights,
  Square,
};
```

- [ ] **Step 4: Run type check to confirm types compile**

Run: `pnpm exec tsc --noEmit` Expected: errors in `position.ts` and `index.ts`
referencing the old `PositionOptions` name — that's expected, we fix those in
the next tasks.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts
git commit -m "refactor: rename PositionOptions to PositionData, add board field"
```

---

### Task 2: Update the `Position` constructor

**Files:**

- Modify: `src/position.ts:31-42` (import)
- Modify: `src/position.ts:53-63` (DEFAULT_OPTIONS type)
- Modify: `src/position.ts:90-116` (constructor)
- Modify: `src/position.ts:316-330` (`#from()`)

- [ ] **Step 1: Update the import in `position.ts`**

In `src/position.ts`, replace `PositionOptions` with `PositionData` in the
import from `./types.js`:

```ts
import type {
  CastlingRights,
  Color,
  DeriveOptions,
  EnPassantSquare,
  File,
  Piece,
  PieceMove,
  PieceType,
  PositionData,
  Square,
} from './types.js';
```

- [ ] **Step 2: Update `DEFAULT_OPTIONS` type annotation**

Replace:

```ts
const DEFAULT_OPTIONS: Required<Omit<PositionOptions, 'enPassantSquare'>> &
  Pick<PositionOptions, 'enPassantSquare'> = {
```

with:

```ts
const DEFAULT_OPTIONS: Required<Omit<PositionData, 'board' | 'enPassantSquare'>> &
  Pick<PositionData, 'enPassantSquare'> = {
```

The value stays the same — only the type annotation changes to exclude `board`
(which has no default).

- [ ] **Step 3: Rewrite the constructor**

Replace the constructor (lines 90-116) with:

```ts
  /**
   * @param data - Board, turn, castling rights, en passant, and move counters.
   *   All fields are optional — omitted fields use defaults.
   */
  constructor(data?: PositionData) {
    // Internal fast path: #from() passes the raw 0x88 array directly,
    // skipping the 128-element allocation that would be immediately overwritten.
    if (Array.isArray(data)) {
      this.#board = data;
    } else {
      // eslint-disable-next-line unicorn/no-new-array -- Array.from is ~24x slower; this is a hot path
      this.#board = new Array<number>(128).fill(0);

      if (data?.board !== undefined) {
        for (const [square, p] of data.board) {
          this.#board[squareToIndex(square)] = pieceToBitmask(p);
        }
      }
    }

    const options = { ...DEFAULT_OPTIONS, ...data };
    this.castlingRights = options.castlingRights;
    this.enPassantSquare = options.enPassantSquare;
    this.fullmoveNumber = options.fullmoveNumber;
    this.halfmoveClock = options.halfmoveClock;
    this.turn = options.turn;
  }
```

Key differences from the old constructor:

- Single `data?` parameter instead of `board?` + `options?`
- Board accessed via `data?.board` instead of just `board`
- Options spread from `data` directly (since `PositionData` includes all fields)
- Internal fast path unchanged — `Array.isArray(data)` still catches raw 0x88
  arrays from `#from()` since no valid `PositionData` is an array

- [ ] **Step 4: Update `#from()`**

The fast path needs to pass both the raw 0x88 array and the option fields. The
constructor's public signature is `(data?: PositionData)`, but internally
`#from()` wraps the raw array into a `PositionData`-shaped object with a non-Map
`board` property. The `Array.isArray` check distinguishes the two paths.

Replace `#from()` with:

```ts
  // Passes the raw 0x88 array directly to the constructor's internal fast
  // path (Array.isArray branch), skipping the 128-element allocation.
  static #from(
    board: number[],
    options: Omit<Required<PositionData>, 'board'>,
  ): Position {
    // @ts-expect-error -- internal: board is number[] not Map, caught by Array.isArray in constructor
    return new Position({ board, ...options });
  }
```

The constructor receives `data` with `data.board` being a `number[]`. The
`Array.isArray(data.board)` check catches this and assigns it directly:

```ts
  constructor(data?: PositionData) {
    // Internal fast path: #from() passes the raw 0x88 array as data.board,
    // skipping the 128-element allocation that would be immediately overwritten.
    if (Array.isArray(data?.board)) {
      this.#board = data.board as unknown as number[];
    } else {
      // eslint-disable-next-line unicorn/no-new-array -- Array.from is ~24x slower; this is a hot path
      this.#board = new Array<number>(128).fill(0);

      if (data?.board !== undefined) {
        for (const [square, p] of data.board) {
          this.#board[squareToIndex(square)] = pieceToBitmask(p);
        }
      }
    }

    const options = { ...DEFAULT_OPTIONS, ...data };
    this.castlingRights = options.castlingRights;
    this.enPassantSquare = options.enPassantSquare;
    this.fullmoveNumber = options.fullmoveNumber;
    this.halfmoveClock = options.halfmoveClock;
    this.turn = options.turn;
  }
```

This avoids `arguments` and keeps the constructor clean — the fast path check
moves from `Array.isArray(data)` (old: checked the first arg) to
`Array.isArray(data?.board)` (new: checks the board property).

- [ ] **Step 5: Run type check**

Run: `pnpm exec tsc --noEmit` Expected: errors only in test files and `index.ts`
(not yet updated).

- [ ] **Step 6: Commit**

```bash
git add src/position.ts
git commit -m "refactor: Position constructor accepts single PositionData object"
```

---

### Task 3: Update exports in `index.ts`

**Files:**

- Modify: `src/index.ts:1-15`

- [ ] **Step 1: Replace `PositionOptions` with `PositionData` in the export
      list**

In `src/index.ts`, replace:

```ts
export type {
  CastlingRights,
  Color,
  DeriveOptions,
  EnPassantSquare,
  File,
  Move,
  Piece,
  PieceType,
  PositionOptions,
  PromotionPieceType,
  Rank,
  SideCastlingRights,
  Square,
} from './types.js';
```

with:

```ts
export type {
  CastlingRights,
  Color,
  DeriveOptions,
  EnPassantSquare,
  File,
  Move,
  Piece,
  PieceType,
  PositionData,
  PromotionPieceType,
  Rank,
  SideCastlingRights,
  Square,
} from './types.js';
```

- [ ] **Step 2: Commit**

```bash
git add src/index.ts
git commit -m "refactor: export PositionData instead of PositionOptions"
```

---

### Task 4: Update tests — `position.spec.ts`

**Files:**

- Modify: `src/__tests__/position.spec.ts`

Every `new Position(board)` becomes `new Position({ board })`. Every
`new Position(board, { ...opts })` becomes `new Position({ board, ...opts })`.
Every `new Position(undefined, { ...opts })` becomes
`new Position({ ...opts })`.

- [ ] **Step 1: Update the import**

In `src/__tests__/position.spec.ts`, line 6, change:

```ts
import type { Piece, Square } from '../types.js';
```

No change needed — `Piece` and `Square` are still exported.

- [ ] **Step 2: Update constructor calls — board-only**

Replace all `new Position(STARTING_POSITION)` with
`new Position({ board: STARTING_POSITION })`.

Replace all `new Position(board)` with `new Position({ board })`.

These appear at lines: 18, 25-28, 60, 72, 76, 80, 89, 92-97, 100-106, 109-115,
130-136, 140-148, 151-165, 168-176, 179-186, 189-196, 200-201, 205-209, 211-217,
219-225, 229-235, 254-258, 263-268, 274-306, 309-315, 320-326, 334, 337-338,
341-348, 351-355, 362-364, 375-376, 386-389, 460-462, 470-471, 481-483.

- [ ] **Step 3: Update constructor calls — board + options**

Replace all `new Position(board, { ...opts })` with
`new Position({ board, ...opts })`.

Specific replacements:

Line 37-46:

```ts
const pos = new Position({
  board,
  turn: 'black',
  halfmoveClock: 5,
  fullmoveNumber: 10,
  castlingRights: {
    black: { king: false, queen: false },
    white: { king: false, queen: false },
  },
  enPassantSquare: 'e3',
});
```

Line 125:

```ts
    expect(new Position({ board, turn: 'black' }).isInsufficientMaterial).toBe(
```

Line 244:

```ts
const pos = new Position({ board, turn: 'white' });
```

Line 259:

```ts
const pos = new Position({ board, turn: 'white' });
```

Line 269:

```ts
const pos = new Position({ board, turn: 'white' });
```

Line 305:

```ts
const pos = new Position({ board, turn: 'white' });
```

Line 316:

```ts
const pos = new Position({ board, turn: 'black' });
```

Line 327:

```ts
const pos = new Position({ board, turn: 'black' });
```

Line 356-357:

```ts
const posW = new Position({ board, turn: 'white' });
const posB = new Position({ board, turn: 'black' });
```

Line 484-487:

```ts
const expected = new Position({
  board,
  turn: 'black',
  enPassantSquare: 'e3',
});
```

- [ ] **Step 4: Update constructor call — undefined board + options**

Line 419:

```ts
const pos = new Position({ enPassantSquare: 'e3' });
```

(Drop the `undefined` first argument — just pass the options directly.)

- [ ] **Step 5: Run tests**

Run: `pnpm test` Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/position.spec.ts
git commit -m "test: update position.spec.ts to single-object constructor"
```

---

### Task 5: Update tests — `reach.spec.ts`

**Files:**

- Modify: `src/__tests__/reach.spec.ts`

- [ ] **Step 1: Update constructor calls**

All `new Position(board)` and `new Position(minBoard)` become
`new Position({ board })` and `new Position({ board: minBoard })`.

All `new Position(STARTING_POSITION)` become
`new Position({ board: STARTING_POSITION })`.

Line 214: `new Position(board, { enPassantSquare: 'f6' })` becomes
`new Position({ board, enPassantSquare: 'f6' })`.

- [ ] **Step 2: Run tests**

Run: `pnpm test` Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/reach.spec.ts
git commit -m "test: update reach.spec.ts to single-object constructor"
```

---

### Task 6: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full pre-PR check**

Run: `pnpm lint && pnpm test && pnpm build` Expected: all three pass with zero
errors.

- [ ] **Step 2: Commit any autofix changes**

If prettier or eslint autofixed anything, commit those changes.

---

### Task 7: Update README and CHANGELOG

**Files:**

- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update README constructor section**

Replace the Constructor section (lines 54-63) with:

````markdown
### Constructor

\```ts new Position() new Position(data: PositionData) \```

The no-argument form creates an empty position with default options. Pass
`{ board: STARTING_POSITION }` for the standard chess opening. Pass any
`PositionData` object to construct an arbitrary position.

\```typescript // From a FEN string (with @echecs/fen) const pos = new
Position(parse(fen)); \```
````

- [ ] **Step 2: Update README Quick Start**

Replace lines 25-26:

```ts
const pos = new Position(STARTING_POSITION);
```

with:

```ts
const pos = new Position({ board: STARTING_POSITION });
```

- [ ] **Step 3: Update README Types section**

Replace `PositionOptions` with `PositionData` in the types list (line 165) and
update its comment:

```ts
  PositionData, // data accepted by the Position constructor
```

- [ ] **Step 4: Update README Constants section**

Replace line 148:

```ts
const pos = new Position(STARTING_POSITION);
```

with:

```ts
const pos = new Position({ board: STARTING_POSITION });
```

- [ ] **Step 5: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: update README and CHANGELOG for PositionData constructor"
```
