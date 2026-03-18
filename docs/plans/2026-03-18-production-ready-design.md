# Design: `@echecs/position` Production-Ready v0.2.0

**Date:** 2026-03-18  
**Status:** Approved

---

## Overview

Make `@echecs/position` production-ready across four dimensions: API
completeness, robustness, developer experience, and npm publishing. The primary
change is replacing the `Position` interface + standalone query functions with
an immutable `Position` class that encapsulates data and queries together.

---

## API

### `Position` Class

Replaces the current `Position` interface and standalone functions in
`src/queries.ts`. The class is immutable after construction — no setters, no
mutating methods. `board` is private; all access is through methods and getters.

No runtime input validation — the library targets TypeScript-only consumers and
relies on the type system as the boundary guard.

#### Constructor

```ts
new Position()
new Position(board: Map<Square, Piece>)
new Position(board: Map<Square, Piece>, options?: {
  castlingRights?: CastlingRights
  enPassantSquare?: Square
  fullmoveNumber?: number
  halfmoveClock?: number
  turn?: Color
})
```

`new Position()` with no arguments defaults to the standard chess starting
position. When a board is provided without options, the remaining fields default
to:

- `turn`: `'w'`
- `castlingRights`: `{ bK: true, bQ: true, wK: true, wQ: true }`
- `enPassantSquare`: `undefined`
- `halfmoveClock`: `0`
- `fullmoveNumber`: `1`

#### Getters

```ts
pos.castlingRights; // CastlingRights
pos.enPassantSquare; // Square | undefined
pos.fullmoveNumber; // number
pos.halfmoveClock; // number
pos.hash; // string — Zobrist hash, computed once and cached
pos.isCheck; // boolean
pos.isInsufficientMaterial; // boolean
pos.isValid; // boolean
pos.turn; // Color
```

`hash` is a Zobrist hash — a 64-bit value derived by XORing random numbers
assigned to each (square, piece type, color) combination, plus turn, castling
rights, and en passant file. It uniquely identifies a position for use by
`@echecs/game` in threefold repetition detection. Computed once on first access
and cached.

`isValid` checks structural validity: two kings present (one per color), no
pawns on ranks 1 or 8, the side not to move is not in check.

`isInsufficientMaterial` returns true for K vs K, K vs KB, and K vs KN.

#### Methods

```ts
pos.attackers(square: Square, color: Color): Square[]
pos.findPiece(piece: Piece): Square[]
pos.isAttacked(square: Square, color: Color): boolean
pos.piece(square: Square): Piece | undefined
pos.pieces(color?: Color): Map<Square, Piece>
```

`attackers` returns the list of squares containing pieces of the given color
that attack the target square. `isAttacked` is a boolean shorthand.

### Constants

`STARTING_POSITION` becomes `new Position()`.

New runtime value constants exported from the main entry point:

```ts
COLORS: Color[]          // ['b', 'w']
FILES: File[]            // ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
PIECE_TYPES: PieceType[] // ['b', 'k', 'n', 'p', 'q', 'r']
RANKS: Rank[]            // ['1', '2', '3', '4', '5', '6', '7', '8']
SQUARES: Square[]        // all 64 squares, a8..h1
```

---

## Source Changes

| File               | Change                                                      |
| ------------------ | ----------------------------------------------------------- |
| `src/position.ts`  | New — the `Position` class                                  |
| `src/types.ts`     | Remove `Position` interface; keep all other types           |
| `src/queries.ts`   | Remove — logic moves into `Position` class                  |
| `src/constants.ts` | `STARTING_POSITION = new Position()`; add runtime constants |
| `src/index.ts`     | Export `Position` class, updated constants, types           |
| `src/__tests__/`   | Update all tests for the new class API                      |

---

## Infrastructure

### Files

- `LICENSE` — MIT
- `README.md` — badges, description, installation, and API usage examples

### GitHub Actions Workflows

Matching the sibling packages exactly:

| Workflow         | Trigger                                                       |
| ---------------- | ------------------------------------------------------------- |
| `auto-merge.yml` | PR — auto-merge Dependabot PRs                                |
| `docs.yml`       | Push to `main` — deploy TypeDoc to GitHub Pages               |
| `format.yml`     | PR + `workflow_call` — run Prettier check                     |
| `lint.yml`       | PR + `workflow_call` — run ESLint + tsc                       |
| `test.yml`       | PR + `workflow_call` — run tests + upload coverage to Codecov |
| `release.yml`    | Push to `main` — publish to npm if version changed            |

### Release Strategy

Publish to npm public registry on version bump in `main`, detected by
`EndBug/version-check`. Requires `NPM_TOKEN` and `CODECOV_TOKEN` repository
secrets.

---

## Out of Scope

The following belong in downstream packages and are explicitly excluded:

- Move generation (`moves()`, `move()`) — `@echecs/game`
- FEN parsing/serialization (`fromFen()`, `toFen()`) — `@echecs/fen`
- Game-over detection (`isCheckmate()`, `isStalemate()`, `isGameOver()`) —
  `@echecs/game`
- Draw by repetition / 50-move rule — `@echecs/game`
- PGN (`@echecs/pgn`)
- `ascii()` debug representation — deferred, can be added later
