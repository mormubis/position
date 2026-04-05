import type { Piece, Square } from './types.js';

const BACK_RANK_TYPES = [
  'rook',
  'knight',
  'bishop',
  'queen',
  'king',
  'bishop',
  'knight',
  'rook',
] as const;
const BACK_RANK_FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

const startingBoardMap = new Map<Square, Piece>();
for (const [index, type] of BACK_RANK_TYPES.entries()) {
  const file = BACK_RANK_FILES[index];
  if (file === undefined) {
    continue;
  }
  startingBoardMap.set(`${file}1` as Square, { color: 'white', type });
  startingBoardMap.set(`${file}2` as Square, { color: 'white', type: 'pawn' });
  startingBoardMap.set(`${file}7` as Square, { color: 'black', type: 'pawn' });
  startingBoardMap.set(`${file}8` as Square, { color: 'black', type });
}

export const startingBoard = startingBoardMap;
