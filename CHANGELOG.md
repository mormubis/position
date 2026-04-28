# Changelog

## [3.1.0] - 2026-04-28

### Added

- `Move` type — `{ from: Square; promotion?: PromotionPieceType; to: Square }`.
- `PromotionPieceType` type — `Exclude<PieceType, 'king' | 'pawn'>`.

## [3.0.5] - 2026-04-09

### Changed

- added `piece` and `square` keywords

## [3.0.4] - 2026-04-09

### Fixed

- Corrected constructor parameter type to `ReadonlyMap` in README.

## [3.0.3] - 2026-04-08

### Fixed

- `derive()` constructor fast path — skips board allocation entirely via
  internal `Array.isArray` branch. ~2x faster than 3.0.2.

### Removed

- `SquareColor` type export — unused across all `@echecs` packages.

## [3.0.2] - 2026-04-08

### Fixed

- `derive()` no longer allocates a throwaway board array — constructor detects
  the internal fast path via `Array.isArray`, skipping the 128-element fill
  entirely. ~2x faster than 3.0.1, ~24x faster than 3.0.0.

## [3.0.1] - 2026-04-08

### Fixed

- `Position` constructor board allocation — replaced `Array.from` with
  `new Array(128).fill(0)`, ~12x faster `derive()` calls.

### Changed

- Removed "Zero runtime dependencies" claim from README — package depends on
  `@echecs/zobrist` since 3.0.0.
- Removed `fen` and `no-dependencies` npm keywords.

### Removed

- `BACKLOG.md` — all items completed.

## [3.0.0] - 2026-04-06

### Added

- `Position.prototype.reach(square, piece)` method — from a square, return all
  squares the given piece can reach on the current board. Filters same-color
  pieces. Includes pawn pushes (single and double), captures, and en passant.
- `Position.prototype.at(square)` method — returns the piece on a square, or
  `undefined` if empty. Replaces `piece()`.
- Lazy `isCheck` cache — computed once per position.
- `@echecs/zobrist` dependency — Polyglot standard Zobrist hash keys.

### Changed

- Position internals rewritten to use bitmask 0x88 array as single source of
  truth. `Map<Square, Piece>` no longer stored internally.
- `castlingRights`, `enPassantSquare`, `fullmoveNumber`, `halfmoveClock`, and
  `turn` are now public readonly fields instead of getters.
- `new Position()` now creates an empty board. Pass `STARTING_POSITION` for the
  standard chess starting position: `new Position(STARTING_POSITION)`.
- `STARTING_POSITION` is now a `ReadonlyMap<Square, Piece>` (the starting board
  map) instead of a `Position` instance.
- Constructor accepts `ReadonlyMap<Square, Piece>` instead of
  `Map<Square, Piece>`.
- `isCheck` reimplemented using reverse-lookup approach (from king, look outward
  for attackers) with the color trick — reuses `reach` internally.
- `isValid` reimplemented using the same approach.
- Zobrist hash now uses Polyglot standard keys for interoperability with opening
  books and other engines.
- Flattened internal module structure — removed `internal/` directory.

### Removed

- `Position.prototype.attackers()` method.
- `Position.prototype.isAttacked()` method.
- `Position.prototype.piece()` method — replaced by `at()`.

## [2.0.1] - 2026-04-05

### Fixed

- Docs CI workflow using renamed script.
- Lockfile out of sync with dependency versions.

## [2.0.0] - 2026-04-05

### Added

- `Position.derive()` method — returns a new position with changes applied,
  without mutating the original. Accepts piece changes as `[square, piece]`
  tuples and optional position option overrides.
- `DeriveOptions` type exported for use with `derive()`.
- `EnPassantSquare` type — restricts en passant target squares to rank 3 and
  rank 6 only.
- `SideCastlingRights` type — `{ king: boolean; queen: boolean }`.
- TypeDoc plugin to collapse expanded `Square` and `EnPassantSquare` unions in
  generated docs.
- JSDoc comments on all public API members.

### Changed

- `Color` values changed from `'b'`/`'w'` to `'black'`/`'white'`.
- `PieceType` values changed from single letters to full words: `'bishop'`,
  `'king'`, `'knight'`, `'pawn'`, `'queen'`, `'rook'`.
- `CastlingRights` restructured from flat `{ bK, bQ, wK, wQ }` to nested
  `{ black: { king, queen }, white: { king, queen } }`.
- `PositionOptions.enPassantSquare` now uses `EnPassantSquare` (rank 3/6 only)
  instead of `Square`.
- TypeDoc docs script renamed to `docs:build` to avoid conflict with pnpm
  built-in `docs` command.

### Removed

- `Move` and `PromotionPieceType` types — consumers should define their own.
- `findPiece()` method — redundant with `pieces()` filtering.
- `COLORS`, `FILES`, `RANKS`, `PIECE_TYPES`, `SQUARES`, `EMPTY_BOARD` constants
  from public API (still used internally).
- `squareColor`, `squareFile`, `squareRank` functions from public API.
- `./internal` export condition — `@echecs/game` should migrate to
  `Position.derive()`.

## [1.0.3] - 2026-04-04

### Fixed

- Added `@preventExpand` JSDoc tag to `Square` type alias so downstream TypeDoc
  (0.28+) renders it as a reference instead of expanding the 64-member union.

## [1.0.2] - 2026-03-19

### Fixed

- Lowercase hex literals in Zobrist table seed constants.

## [1.0.1] - 2026-03-19

### Changed

- Extracted primitive constants (`COLORS`, `FILES`, `RANKS`, `PIECE_TYPES`,
  `SQUARES`) into `src/primitives.ts` to eliminate duplication in
  `src/internal/zobrist.ts`. No API or behavior change.

## [1.0.0] - 2026-03-19

### Added

- `Position` class replacing the `Position` interface — immutable value object
  with private board state and a clean query API
- Constructor signatures: `new Position()` (starting position),
  `new Position(board)`, and `new Position(board, options)`
- Getters: `castlingRights`, `enPassantSquare`, `fullmoveNumber`,
  `halfmoveClock`, `hash`, `isCheck`, `isInsufficientMaterial`, `isValid`,
  `turn`
- Methods: `attackers`, `findPiece`, `isAttacked`, `piece`, `pieces`
- Zobrist hash (`hash` getter) — deterministic 16-character hex string for
  position identity, computed once and cached
- `isValid` — validates king presence, no pawns on back ranks, and that the side
  not to move is not in check
- `isInsufficientMaterial` — FIDE-compliant: K vs K, K+B vs K, K+N vs K, and K+B
  vs K+B with same-color bishops
- Runtime constants: `COLORS`, `FILES`, `RANKS`, `PIECE_TYPES`, `SQUARES`
- `PositionOptions` type exported for use in consuming code
- `Move` and `PromotionPieceType` types exported for companion packages
- MIT `LICENSE` file
- `README.md` with installation, quick start, and full API reference
- GitHub Actions CI/CD workflows (lint, test, format, docs, release, auto-merge)

### Changed

- `SquareColor` values changed from `'l'`/`'d'` to `'light'`/`'dark'`
- `STARTING_POSITION` is now a `Position` instance instead of a plain object
- Standalone query functions (`isAttacked`, `isCheck`, `piece`, `pieces`)
  removed from public API — use `Position` methods instead

### Removed

- `Position` interface (replaced by class)
- `startingBoard` export (implementation detail)

## [0.1.0] - 2026-03-18

### Added

- Initial release with `Position` interface, `EMPTY_BOARD`, `STARTING_POSITION`
- Internal 0x88 board representation (`./internal` export condition)
- Standalone query functions: `isAttacked`, `isCheck`, `piece`, `pieces`
- Square utilities: `squareColor`, `squareFile`, `squareRank`
- Types: `CastlingRights`, `Color`, `File`, `Move`, `Piece`, `PieceType`,
  `PromotionPieceType`, `Rank`, `Square`, `SquareColor`
