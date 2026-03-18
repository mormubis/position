import type { File, Rank, Square, SquareColor } from './types.js';

function squareFile(square: Square): File {
  return square[0] as File;
}

function squareRank(square: Square): Rank {
  return square[1] as Rank;
}

/**
 * Returns 'dark' or 'light' for the given square.
 * a1 is dark: file index 0 + rank 1 = 1 (odd) → 'dark'.
 * b1 is light: file index 1 + rank 1 = 2 (even) → 'light'.
 */
function squareColor(square: Square): SquareColor {
  const file = (square.codePointAt(0) ?? 0) - ('a'.codePointAt(0) ?? 0);
  const rank = Number.parseInt(square[1] ?? '1', 10);
  return (file + rank) % 2 === 1 ? 'dark' : 'light';
}

export { squareColor, squareFile, squareRank };
