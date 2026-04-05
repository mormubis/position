import type { Square, SquareColor } from './types.js';

/**
 * Returns the color of a square — `'dark'` or `'light'`.
 *
 * @param square - The square to query.
 */
function squareColor(square: Square): SquareColor {
  const file = (square.codePointAt(0) ?? 0) - ('a'.codePointAt(0) ?? 0);
  const rank = Number.parseInt(square[1] ?? '1', 10);
  return (file + rank) % 2 === 1 ? 'dark' : 'light';
}

export { squareColor };
