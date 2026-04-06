import type { Color, Piece, PieceType, Square } from './types.js';

const OFF_BOARD = 0x88;

const WHITE = 0;
const BLACK = 8;
const PAWN = 1;
const KNIGHT = 2;
const BISHOP = 3;
const ROOK = 4;
const QUEEN = 5;
const KING = 6;

const TYPE_MASK = 0b0111;
const COLOR_MASK = 0b1000;

const FILES = 'abcdefgh';

const PIECE_TYPE_TO_NUM: Record<PieceType, number> = {
  bishop: BISHOP,
  king: KING,
  knight: KNIGHT,
  pawn: PAWN,
  queen: QUEEN,
  rook: ROOK,
};

const NUM_TO_PIECE_TYPE: PieceType[] = [
  'pawn',
  'pawn',
  'knight',
  'bishop',
  'rook',
  'queen',
  'king',
];

function squareToIndex(square: Square): number {
  const file = (square.codePointAt(0) ?? 0) - ('a'.codePointAt(0) ?? 0);
  const rank = Number.parseInt(square[1] ?? '1', 10);
  return (8 - rank) * 16 + file;
}

function indexToSquare(index: number): Square {
  const file = index & 0x07;
  const rank = 8 - ((index >> 4) & 0x07);
  return `${FILES[file]}${rank}` as Square;
}

function pieceToBitmask(piece: Piece): number {
  return (
    (piece.color === 'black' ? BLACK : WHITE) | PIECE_TYPE_TO_NUM[piece.type]
  );
}

function bitmaskToPiece(value: number): Piece | undefined {
  if (value === 0) {
    return undefined;
  }
  const color: Color = (value & COLOR_MASK) === 0 ? 'white' : 'black';
  const type = NUM_TO_PIECE_TYPE[value & TYPE_MASK];
  if (type === undefined) {
    return undefined;
  }
  return { color, type };
}

export {
  BISHOP,
  BLACK,
  COLOR_MASK,
  KING,
  KNIGHT,
  OFF_BOARD,
  PAWN,
  QUEEN,
  ROOK,
  TYPE_MASK,
  WHITE,
  bitmaskToPiece,
  indexToSquare,
  pieceToBitmask,
  squareToIndex,
};
