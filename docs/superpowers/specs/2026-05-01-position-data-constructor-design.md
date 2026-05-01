# Position single-object constructor

**Issue:** [#26](https://github.com/echecsjs/position/issues/26) **Semver:**
major (v4) **Approach:** replace `(board?, options?)` with
`(data?: PositionData)`

## Problem

The `Position` constructor takes `(board?, options?)` where options is
`PositionOptions` — 5 optional fields. The natural input for constructing a
position is exactly what `@echecs/fen`'s `parse()` returns:
`{ board, castlingRights, enPassantSquare, fullmoveNumber, halfmoveClock, turn }`.

Going from FEN to Position currently requires destructuring:

```ts
const data = parse(fen);
const position = new Position(data.board, {
  castlingRights: data.castlingRights,
  enPassantSquare: data.enPassantSquare,
  fullmoveNumber: data.fullmoveNumber,
  halfmoveClock: data.halfmoveClock,
  turn: data.turn,
});
```

## Design

### New interface: `PositionData`

Replaces `PositionOptions`. All 6 fields optional — defaults still apply for
`new Position()`.

```ts
interface PositionData {
  board?: ReadonlyMap<Square, Piece>;
  castlingRights?: CastlingRights;
  enPassantSquare?: EnPassantSquare;
  fullmoveNumber?: number;
  halfmoveClock?: number;
  turn?: Color;
}
```

- exported from `types.ts` and `index.ts`
- `PositionOptions` is removed entirely
- `DeriveOptions` extends `Omit<PositionData, 'board'>` instead of
  `PositionOptions` — `derive()` receives board changes through `changes` (delta
  tuples), not through a full `Map`, so inheriting `board` would be misleading

`@echecs/fen`'s `Position` interface (all fields required) is structurally
assignable to `PositionData` since every required field satisfies the optional
counterpart — `new Position(parse(fen))` works with no changes to `@echecs/fen`.

### Constructor

```ts
constructor(data?: PositionData)
```

- `new Position()` — empty board with defaults
- `new Position({ board: myMap })` — custom board, default options
- `new Position(parse(fen))` — direct round-trip

The internal fast path (`Array.isArray` check for raw 0x88 arrays passed by
`#from()` / `derive()`) stays unchanged.

### Internal `#from()`

Currently takes `(board: number[], options: { ... })`. Updated to pass a single
object for consistency, but this is purely internal.

### Exports diff

```diff
- PositionOptions
+ PositionData
```

One type removed, one added. All other exports unchanged.

### Test changes

All tests constructing `Position` with `(board, options)` update to
`({ board, ...options })`. No behavioral change — same defaults, same semantics.

### Cross-package impact

`@echecs/fen`'s `Position` interface stays compatible via structural typing. No
changes needed in `@echecs/fen` for this to work. A follow-up could have
`@echecs/fen` re-export `PositionData` directly, but that's out of scope.
