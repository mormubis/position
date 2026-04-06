# Bitmask 0x88 board as single internal representation

## Summary

Replace the internal `Map<Square, Piece>` with a bitmask-based 0x88 array as the
single source of truth. Public readonly fields replace private + getter
pass-throughs. Conversion to `Piece` objects only happens at the public API
boundary. Internal operations (attack detection, board walking) work entirely on
integer arithmetic.

## Motivation

Position currently holds two representations: a `Map<Square, Piece>` as the
primary store, and a lazily cached 0x88 array for `reach()`. This is redundant.
The 0x88 array is faster for every internal operation — attack detection, board
walking, validity checking. The Map only serves the public API.

By making the 0x88 array the single source and storing pieces as bitmask numbers
instead of objects, all internal operations become pure integer math. No object
allocation, no string comparisons, no Map lookups on the hot path.

## Bitmask scheme

```
bits 0-2: piece type
  pawn   = 1  (0b001)
  knight = 2  (0b010)
  bishop = 3  (0b011)
  rook   = 4  (0b100)
  queen  = 5  (0b101)
  king   = 6  (0b110)

bit 3: color
  white = 0  (0b0000)
  black = 8  (0b1000)

empty = 0
```

Examples: `WHITE_PAWN = 1`, `BLACK_KNIGHT = 10`, `WHITE_KING = 6`,
`BLACK_QUEEN = 13`.

Operations:

- Extract type: `value & 0b0111`
- Extract color: `value & 0b1000`
- Is white: `(value & 0b1000) === 0` (and `value !== 0`)
- Is black: `(value & 0b1000) !== 0`
- Is empty: `value === 0`
- Is specific piece: `value === BLACK_KNIGHT`

Bitmask constants are internal to Position — not exported.

## Internal state

```typescript
class Position {
  // public readonly — direct access, no getter
  readonly castlingRights: CastlingRights;
  readonly enPassantSquare: EnPassantSquare | undefined;
  readonly fullmoveNumber: number;
  readonly halfmoveClock: number;
  readonly turn: Color;

  // private — internal state
  #board: number[]; // 128-element 0x88 array, bitmask pieces
  #hash: string | undefined;
  #isCheck: boolean | undefined;
}
```

Five fields that were private + getter become public readonly. TypeScript
`readonly` prevents mutation from outside. Same external behavior.

The `Map<Square, Piece>` is gone. The `#board0x88` lazy cache is gone — the
array IS the board. `#isCheckCache` renamed to `#isCheck`.

## Constructor

Public signature unchanged:

```typescript
constructor(board?: Map<Square, Piece>, options?: PositionOptions)
```

Internally: converts the Map to a 0x88 array immediately. If no board is
provided, initializes a 128-element array filled with `0` (empty board).

## Private static factory: `#from`

```typescript
static #from(board: number[], options: Required<PositionOptions>): Position
```

Creates a Position from a raw 0x88 array without the Map conversion. Used by
`derive()` to avoid the Map round-trip — it already has the array, applies
changes, and passes it directly.

Not accessible from outside the class.

## Public API — conversion at the boundary

### `piece(square): Piece | undefined`

`squareToIndex(square)` → read `#board[index]` → if `0` return `undefined`,
otherwise convert bitmask to `{ color, type }`.

### `pieces(color?): Map<Square, Piece>`

Iterate the 0x88 array. Skip off-board (`index & 0x88`) and empty (`=== 0`)
slots. For each piece, convert index to square name, bitmask to `Piece` object.
Optionally filter by color using `value & 0b1000`. Return a new Map.

### `derive(changes?): Position`

Receives `[Square, Piece | undefined][]` from the consumer. Copies the 0x88
array. For each change, converts square to index and piece to bitmask (or `0`
for removal). Calls `Position.#from(newBoard, options)` — no Map involved.

### `reach(square, move): Square[]`

Walks the 0x88 array using the move offset. Checks `board[index] !== 0` for
occupancy. Converts result indices to square names only for the return value.
Internal callers (isCheck, isValid) don't go through `reach()` — they walk the
array directly to avoid the string conversion.

## Computed getters

### `hash`

Cached in `#hash`. Iterates the 0x88 array directly. For each non-zero slot,
extracts square/type/color from the index and bitmask, calls `pieceHash()`. XORs
with turn, castling, and en passant hashes as before.

### `isCheck`

Cached in `#isCheck`. Walks from the king index in each piece move direction
directly on the 0x88 array. For each direction, checks the bitmask of the first
piece found against the expected attacker type. Pure index arithmetic — no
`reach()`, no `#computeIsAttacked`, no string conversion.

Steps:

1. Scan `#board` for the king bitmask matching `this.turn`.
2. For each knight offset: check `board[kingIndex + offset]` for enemy knight.
3. For each rook direction (slide): walk until hitting a piece or off-board.
   Check for enemy rook or queen.
4. For each bishop direction (slide): same, check for enemy bishop or queen.
5. For each king offset: check for enemy king.
6. For pawn capture offsets (depends on color): check for enemy pawn.

### `isValid`

Same approach. Iterates the array to count kings and check pawn ranks. Uses the
same inline attack detection (from opponent king, look outward) to verify the
side not to move is not in check.

### `isInsufficientMaterial`

Iterates the array. Collects non-king piece types and their square indices. Uses
`squareColor()` for the bishop same-color check — this is the one place that
needs index-to-square conversion internally, but only for the rare all-bishops
case.

## Removed

- `Map<Square, Piece>` as internal storage (`#board` was a Map, now it's an
  array)
- `#board0x88` lazy cache field and `#getBoard0x88()` method
- `#computeIsAttacked()` private method
- `boardFromMap()` function from `board.ts` (conversion logic moves into the
  constructor and becomes internal to Position)
- Five private fields + getter pairs replaced by public readonly fields

## Tests

Existing tests stay — the public API is unchanged. Internal restructuring should
not require new tests beyond what already exists for `piece()`, `pieces()`,
`reach()`, `derive()`, `isCheck`, `isValid`, `hash`, etc.

One area to verify: the bitmask conversion round-trip. A few targeted tests that
construct positions and verify `piece()` returns the correct objects. The
existing constructor and `piece` tests already cover this.

## Not in scope

- Exposing bitmask constants or the raw array publicly
- Changing the `Piece` type at the public API level
- Changing the `PieceMove` constants or `reach()` return type
- Performance benchmarks (this is a correctness refactor with performance as a
  side effect)
