# Position

[![npm](https://img.shields.io/npm/v/@echecs/position)](https://www.npmjs.com/package/@echecs/position)
[![Test](https://github.com/mormubis/position/actions/workflows/test.yml/badge.svg)](https://github.com/mormubis/position/actions/workflows/test.yml)
[![Coverage](https://codecov.io/gh/mormubis/position/branch/main/graph/badge.svg)](https://codecov.io/gh/mormubis/position)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![API Docs](https://img.shields.io/badge/API-docs-blue.svg)](https://mormubis.github.io/position/)

**Position** is a TypeScript library representing a complete chess position —
the board, turn, castling rights, en passant square, halfmove clock, and
fullmove number — as an immutable value object with a clean query API. It is the
foundational package in the `@echecs` family of chess libraries. Zero runtime
dependencies.

## Installation

```bash
npm install @echecs/position
```

## Quick Start

```typescript
import { Position, STARTING_POSITION } from '@echecs/position';

// Starting position
const pos = new Position();

console.log(pos.turn); // 'w'
console.log(pos.fullmoveNumber); // 1
console.log(pos.isCheck); // false

// Query the board
const piece = pos.piece('e1'); // { color: 'w', type: 'k' }
const whites = pos.pieces('w'); // Map<Square, Piece> of all white pieces

// Find all squares a piece occupies
const whiteKing = pos.findPiece({ color: 'w', type: 'k' }); // ['e1']

// Attack queries
const attackers = pos.attackers('e5', 'b'); // squares of black pieces attacking e5
const attacked = pos.isAttacked('f7', 'w'); // true if white attacks f7
```

## API

Full API reference is available at https://mormubis.github.io/position/

### Constructor

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

The no-argument form creates the standard chess starting position. Pass a custom
`board` map and optional `options` to construct any arbitrary position.

### Getters

| Getter                   | Type                  | Description                                                                                                                      |
| ------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `castlingRights`         | `CastlingRights`      | Which castling moves remain available                                                                                            |
| `enPassantSquare`        | `Square \| undefined` | En passant target square, if any                                                                                                 |
| `fullmoveNumber`         | `number`              | Fullmove counter (increments after Black's move)                                                                                 |
| `halfmoveClock`          | `number`              | Halfmove clock for the fifty-move rule                                                                                           |
| `hash`                   | `string`              | Zobrist hash string for position identity                                                                                        |
| `isCheck`                | `boolean`             | Whether the side to move is in check                                                                                             |
| `isInsufficientMaterial` | `boolean`             | Whether the position is a FIDE draw by insufficient material (K vs K, K+B vs K, K+N vs K, or K+B vs K+B with same-color bishops) |
| `isValid`                | `boolean`             | Whether the position is legally reachable                                                                                        |
| `turn`                   | `Color`               | Side to move (`'w'` or `'b'`)                                                                                                    |

### Methods

#### `attackers(square, color): Square[]`

Returns all squares occupied by pieces of `color` that attack `square`.

```typescript
pos.attackers('e5', 'b'); // e.g. ['d7', 'f6']
```

#### `derive(changes?): Position`

Returns a new `Position` with the given changes applied. The original is not
modified. Fields not provided are carried over from the source.

```typescript
// move e2 pawn to e4
const next = pos.derive({
  changes: [
    ['e2', undefined],
    ['e4', { color: 'white', type: 'pawn' }],
  ],
  turn: 'black',
  enPassantSquare: 'e3',
});

// clone
const clone = pos.derive();
```

#### `findPiece(piece): Square[]`

Returns all squares occupied by the given piece.

```typescript
pos.findPiece({ color: 'w', type: 'q' }); // ['d1']
```

#### `isAttacked(square, color): boolean`

Returns `true` if any piece of `color` attacks `square`.

```typescript
pos.isAttacked('f3', 'w'); // true if white attacks f3
```

#### `piece(square): Piece | undefined`

Returns the piece on `square`, or `undefined` if the square is empty.

```typescript
pos.piece('e1'); // { color: 'w', type: 'k' }
pos.piece('e5'); // undefined (empty in starting position)
```

#### `pieces(color?): Map<Square, Piece>`

Returns a map of all pieces, optionally filtered by `color`.

```typescript
pos.pieces(); // all 32 pieces in starting position
pos.pieces('w'); // 16 white pieces
```

### Constants

```typescript
import {
  COLORS, // ['b', 'w']
  FILES, // ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  RANKS, // ['1', '2', '3', '4', '5', '6', '7', '8']
  PIECE_TYPES, // ['b', 'k', 'n', 'p', 'q', 'r']
  SQUARES, // all 64 squares, a8–h1 (rank 8 to rank 1)
  EMPTY_BOARD, // empty Map<Square, Piece>
  STARTING_POSITION, // Position instance for the standard starting position
} from '@echecs/position';
```

### Types

All types are exported for use in consuming code and companion packages.

```typescript
import type {
  CastlingRights, // { bK: boolean; bQ: boolean; wK: boolean; wQ: boolean }
  Color, // 'w' | 'b'
  DeriveOptions, // options accepted by Position.derive()
  File, // 'a' | 'b' | ... | 'h'
  Move, // { from: Square; to: Square; promotion: PromotionPieceType | undefined }
  Piece, // { color: Color; type: PieceType }
  PieceType, // 'b' | 'k' | 'n' | 'p' | 'q' | 'r'
  PositionOptions, // options accepted by the Position constructor
  PromotionPieceType, // 'b' | 'n' | 'q' | 'r'
  Rank, // '1' | '2' | ... | '8'
  Square, // 'a1' | 'a2' | ... | 'h8'
  SquareColor, // 'light' | 'dark'
} from '@echecs/position';
```

`Move` and `PromotionPieceType` are exported for use by companion packages
(`@echecs/san`, `@echecs/game`) that build on this foundational type.
