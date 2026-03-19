# Changelog

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
