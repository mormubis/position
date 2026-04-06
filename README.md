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

console.log(pos.turn); // 'white'
console.log(pos.fullmoveNumber); // 1
console.log(pos.isCheck); // false

// Query the board
const piece = pos.piece('e1'); // { color: 'white', type: 'king' }
const whites = pos.pieces('white'); // Map<Square, Piece> of all white pieces

// Board queries
import { KNIGHT_MOVES } from '@echecs/position';

const reachable = pos.reach('e4', KNIGHT_MOVES[0]!); // squares the knight can reach

// Derive a new position
const next = pos.derive({
  changes: [
    ['e2', undefined],
    ['e4', { color: 'white', type: 'pawn' }],
  ],
  turn: 'black',
  enPassantSquare: 'e3',
});
```

## API

Full API reference is available at https://mormubis.github.io/position/

### Constructor

```ts
new Position()
new Position(board: Map<Square, Piece>)
new Position(board: Map<Square, Piece>, options?: PositionOptions)
```

The no-argument form creates the standard chess starting position. Pass a custom
`board` map and optional `options` to construct any arbitrary position.

### Getters

| Getter                   | Type                           | Description                                                     |
| ------------------------ | ------------------------------ | --------------------------------------------------------------- |
| `castlingRights`         | `CastlingRights`               | Which castling moves remain available                           |
| `enPassantSquare`        | `EnPassantSquare \| undefined` | En passant target square (rank 3 or 6), if any                  |
| `fullmoveNumber`         | `number`                       | Game turn counter — increments after each black move            |
| `halfmoveClock`          | `number`                       | Half-moves since last pawn advance or capture (fifty-move rule) |
| `hash`                   | `string`                       | Zobrist hash string for position identity                       |
| `isCheck`                | `boolean`                      | Whether the side to move is in check                            |
| `isInsufficientMaterial` | `boolean`                      | Whether the position is a FIDE draw by insufficient material    |
| `isValid`                | `boolean`                      | Whether the position is legally reachable                       |
| `turn`                   | `Color`                        | Side to move (`'white'` or `'black'`)                           |

### Methods

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

#### `reach(square, move): Square[]`

From `square`, apply the move descriptor and return the squares reached. For
single-hop moves, returns the target square if it is on the board. For sliding
moves, walks step by step until hitting the board edge or an occupied square
(included as a potential capture target).

```typescript
import { ROOK_MOVES, KNIGHT_MOVES } from '@echecs/position';

pos.reach('e4', KNIGHT_MOVES[0]!); // ['d6']
pos.reach('e1', ROOK_MOVES[0]!); // ['e2', 'e3', ...] until blocked
```

#### `piece(square): Piece | undefined`

Returns the piece on `square`, or `undefined` if the square is empty.

```typescript
pos.piece('e1'); // { color: 'white', type: 'king' }
pos.piece('e5'); // undefined (empty in starting position)
```

#### `pieces(color?): Map<Square, Piece>`

Returns a map of all pieces, optionally filtered by `color`.

```typescript
pos.pieces(); // all 32 pieces in starting position
pos.pieces('white'); // 16 white pieces
```

### Constants

```typescript
import { STARTING_POSITION } from '@echecs/position';
```

`STARTING_POSITION` is a `Position` instance for the standard chess starting
position. Equivalent to `new Position()`.

### Move Constants

Describe how each piece type moves on the board. Used with `reach` for move
generation and attack detection.

```typescript
import {
  BISHOP_MOVES, // 4 diagonal directions (sliding)
  KING_MOVES, // 8 adjacent squares
  KNIGHT_MOVES, // 8 L-shaped hops
  PAWN_MOVES, // { white: { push, captures }, black: { push, captures } }
  ROOK_MOVES, // 4 rank/file directions (sliding)
} from '@echecs/position';
```

Each move has an `offset` (0x88 board offset) and an optional `slide` flag.
Queen moves are not exported — compose them as
`[...BISHOP_MOVES, ...ROOK_MOVES]`.

### Types

All types are exported for use in consuming code and companion packages.

```typescript
import type {
  CastlingRights, // { black: SideCastlingRights; white: SideCastlingRights }
  Color, // 'black' | 'white'
  DeriveOptions, // options accepted by Position.derive()
  EnPassantSquare, // en passant target square (rank 3 or 6 only)
  File, // 'a' | 'b' | ... | 'h'
  Piece, // { color: Color; type: PieceType }
  PieceMove, // { offset: number; slide?: boolean }
  PieceType, // 'bishop' | 'king' | 'knight' | 'pawn' | 'queen' | 'rook'
  PositionOptions, // options accepted by the Position constructor
  Rank, // '1' | '2' | ... | '8'
  SideCastlingRights, // { king: boolean; queen: boolean }
  Square, // 'a1' | 'a2' | ... | 'h8'
  SquareColor, // 'dark' | 'light'
} from '@echecs/position';
```
