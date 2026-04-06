# Replace attack methods with `reach` and piece move constants

## Summary

Remove `attackers` and `isAttacked` from `Position`. Replace them with a `reach`
method and piece move constants. `reach` walks the board from a square in a
given direction and returns the squares encountered. The move constants describe
how each piece type moves on the 0x88 board. Together they let `@echecs/game` do
move generation and attack detection without accessing position internals.

Also: remove the `internal/` directory, add lazy caching of the 0x88 board and
`isCheck` result.

## Motivation

`attackers` and `isAttacked` infer move legality, which belongs in
`@echecs/game`. But game needs efficient board operations to do its job.
Previously it imported raw 0x88 primitives from `./internal` — that export
condition was removed in v2.0.0.

Instead of re-exposing internals, we provide two building blocks:

- **`reach`** — "from this square, following this move descriptor, which squares
  can I reach?" Position answers using its internal 0x88 board. Game never
  touches the array.
- **Move constants** — describe how each piece type moves (offsets and whether
  it slides). This is board geometry, not game logic.

Game uses `reach` for move generation, `derive` to apply moves, and `isCheck`
for legality filtering. Position stays immutable. No internals exposed.

## New: `reach` method

```typescript
Position.prototype.reach(square: Square, move: PieceMove): Square[]
```

From `square`, apply the move descriptor and return the squares reached.

- If `move.slide` is false (or absent): single hop. Returns the target square if
  it is on the board, or an empty array if off-board. Does NOT filter by
  occupancy — game decides what to do with the result.
- If `move.slide` is true: walk step by step in the offset direction. Collect
  every square until hitting off-board or an occupied square. The first occupied
  square IS included (it could be a capture). Stop after.

Returns `Square[]`. Always ordered from closest to farthest from `square`.

Internally: uses a lazily cached 0x88 board array. First call to `reach` (or
`isCheck`/`isValid`) builds it; subsequent calls reuse it.

### `PieceMove` type

```typescript
interface PieceMove {
  offset: number;
  slide?: boolean;
}
```

Exported from the main entry point.

## New: move constants

```typescript
const KNIGHT_MOVES: PieceMove[] = [
  { offset: -33 },
  { offset: -31 },
  { offset: -18 },
  { offset: -14 },
  { offset: 14 },
  { offset: 18 },
  { offset: 31 },
  { offset: 33 },
];

const BISHOP_MOVES: PieceMove[] = [
  { offset: -17, slide: true },
  { offset: -15, slide: true },
  { offset: 15, slide: true },
  { offset: 17, slide: true },
];

const ROOK_MOVES: PieceMove[] = [
  { offset: -16, slide: true },
  { offset: -1, slide: true },
  { offset: 1, slide: true },
  { offset: 16, slide: true },
];

const KING_MOVES: PieceMove[] = [
  { offset: -17 },
  { offset: -16 },
  { offset: -15 },
  { offset: -1 },
  { offset: 1 },
  { offset: 15 },
  { offset: 16 },
  { offset: 17 },
];

const PAWN_MOVES: {
  black: { captures: PieceMove[]; push: PieceMove };
  white: { captures: PieceMove[]; push: PieceMove };
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
```

All exported from the main entry point. Queen moves are not exported — game
composes `[...BISHOP_MOVES, ...ROOK_MOVES]`.

## New: lazy caching

### 0x88 board cache

Position gains a private `#board0x88` field, lazily built from `#board` (the
Map) on first access. Used internally by `reach`, `isCheck`, and `isValid`.

### `isCheck` cache

Position gains a private `#isCheckCache` field. Computed once on first access,
reused after. Same pattern as `hash`.

## Removals

### `Position.prototype.attackers(square, by)`

Removed entirely.

### `Position.prototype.isAttacked(square, by)`

Removed entirely.

### `#isAttackedByPiece` private helper

Removed. `isCheck` and `isValid` are reimplemented using `reach` internally.

### `internal/` directory

Flattened — `board.ts`, `tables.ts`, `zobrist.ts` move to `src/` root. The
barrel `internal/index.ts` is deleted.

## Changes

### `isCheck` getter

Reimplemented. Instead of iterating all enemy pieces and calling
`#isAttackedByPiece`, it uses the reverse approach: from the king square, look
outward using each move constant to find attackers.

For each direction:

- Knight moves: single hop, check for enemy knight.
- Rook moves (slide): first piece in line, check for enemy rook or queen.
- Bishop moves (slide): first piece in line, check for enemy bishop or queen.
- King moves: single hop, check for enemy king.
- Pawn captures: single hop, check for enemy pawn (using the correct color
  direction — from white king's perspective, check black pawn capture offsets).

Result is cached.

### `isValid` getter

Same approach — uses the reverse attack detection from the opponent king's
perspective to check that the side not to move is not in check.

## Kept

- `isCheck` — getter, reimplemented + cached
- `isValid` — getter, reimplemented
- `derive` — unchanged
- `piece`, `pieces` — unchanged
- All other getters — unchanged

## How `@echecs/game` uses this

### Move generation

```typescript
// knight moves from e4
for (const move of KNIGHT_MOVES) {
  const squares = position.reach('e4', move);
  for (const sq of squares) {
    const piece = position.piece(sq);
    if (piece?.color === 'white') continue; // friendly
    // sq is a pseudo-legal target
  }
}

// bishop moves from c1
for (const move of BISHOP_MOVES) {
  const squares = position.reach('c1', move);
  for (const sq of squares) {
    const piece = position.piece(sq);
    if (piece?.color === 'white') continue;
    // sq is a pseudo-legal target
    // reach already stopped at the first occupied square
  }
}
```

### Legality filtering

```typescript
for (const candidate of pseudoLegalMoves) {
  const next = position.derive({
    changes: [
      [candidate.from, undefined],
      [candidate.to, position.piece(candidate.from)],
    ],
  });

  if (!next.isCheck) {
    legalMoves.push(candidate);
  }
}
```

`derive` copies the Map. `isCheck` on the derived position lazily builds its
0x88 board and caches the check result. No internals exposed. Position stays
immutable.

### Attack detection

```typescript
// is square e4 attacked by black?
// from e4, look outward using each piece's moves
function isAttacked(position: Position, square: Square, by: Color): boolean {
  for (const move of KNIGHT_MOVES) {
    for (const sq of position.reach(square, move)) {
      const p = position.piece(sq);
      if (p?.color === by && p.type === 'knight') return true;
    }
  }
  for (const move of ROOK_MOVES) {
    for (const sq of position.reach(square, move)) {
      const p = position.piece(sq);
      if (p === undefined) continue;
      if (p.color === by && (p.type === 'rook' || p.type === 'queen'))
        return true;
      break; // blocked
    }
  }
  for (const move of BISHOP_MOVES) {
    for (const sq of position.reach(square, move)) {
      const p = position.piece(sq);
      if (p === undefined) continue;
      if (p.color === by && (p.type === 'bishop' || p.type === 'queen'))
        return true;
      break;
    }
  }
  // ... pawn captures, king
  return false;
}
```

## Tests

- Remove test suites for `attackers` and `isAttacked`.
- Add test suite for `reach` — single hop (knight/king), slide (bishop/rook),
  off-board, occupied squares, empty board, edge squares.
- Add tests for move constants — verify offset values and slide flags.
- `isCheck` and `isValid` tests stay unchanged.
- Add test that `isCheck` result is cached (same reference on repeated access —
  or just verify it returns the same value, since caching is an implementation
  detail).

## Breaking changes

Major version bump — **v3.0.0**.

- `Position.prototype.attackers()` — removed
- `Position.prototype.isAttacked()` — removed
- `PieceMove` type — added
- `reach` method — added
- Move constants — added

## Export surface after this change

From `.` (main):

- `Position` class (with `reach`, `isCheck`, `isValid`, `piece`, `pieces`,
  `derive`, and all existing getters)
- `KNIGHT_MOVES`, `BISHOP_MOVES`, `ROOK_MOVES`, `KING_MOVES`, `PAWN_MOVES`
- `PieceMove` type
- `STARTING_POSITION`
- All existing type exports
