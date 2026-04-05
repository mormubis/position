import type { Piece, Square } from '../types.js';

const OFF_BOARD = 0x88;

function squareToIndex(square: Square): number {
  const file = (square.codePointAt(0) ?? 0) - ('a'.codePointAt(0) ?? 0);
  const rank = Number.parseInt(square[1] ?? '1', 10);
  return (8 - rank) * 16 + file;
}

/**
 * Converts a Map<Square, Piece> to the internal 0x88 array representation.
 * The bridge between the public Position type and the 0x88 internal layout.
 */
function boardFromMap(map: Map<Square, Piece>): (Piece | undefined)[] {
  const board: (Piece | undefined)[] = Array.from({ length: 128 });
  for (const [square, p] of map) {
    board[squareToIndex(square)] = p;
  }
  return board;
}

export { OFF_BOARD, boardFromMap, squareToIndex };
