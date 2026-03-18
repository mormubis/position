import type {
  CastlingRights,
  Color,
  File,
  Piece,
  PieceType,
  Position,
  Rank,
  Square,
} from './types.js';

const COLORS_LIST: Color[] = ['b', 'w'];
const FILES_LIST: File[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS_LIST: Rank[] = ['1', '2', '3', '4', '5', '6', '7', '8'];
const PIECE_TYPES_LIST: PieceType[] = ['b', 'k', 'n', 'p', 'q', 'r'];
const SQUARES_LIST: Square[] = FILES_LIST.flatMap((f) =>
  RANKS_LIST.toReversed().map((r) => `${f}${r}` as Square),
);

const BACK_RANK_TYPES = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'] as const;
const BACK_RANK_FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

const startingBoardMap = new Map<Square, Piece>();
for (const [index, type] of BACK_RANK_TYPES.entries()) {
  const file = BACK_RANK_FILES[index];
  if (file === undefined) {
    continue;
  }
  startingBoardMap.set(`${file}1` as Square, { color: 'w', type });
  startingBoardMap.set(`${file}2` as Square, { color: 'w', type: 'p' });
  startingBoardMap.set(`${file}7` as Square, { color: 'b', type: 'p' });
  startingBoardMap.set(`${file}8` as Square, { color: 'b', type });
}

const STARTING_CASTLING: CastlingRights = {
  bK: true,
  bQ: true,
  wK: true,
  wQ: true,
};

const STARTING_POSITION_OBJ: Position = {
  board: startingBoardMap,
  castlingRights: STARTING_CASTLING,
  enPassantSquare: undefined,
  fullmoveNumber: 1,
  halfmoveClock: 0,
  turn: 'w',
};

export const COLORS = COLORS_LIST;
export const FILES = FILES_LIST;
export const RANKS = RANKS_LIST;
export const PIECE_TYPES = PIECE_TYPES_LIST;
export const SQUARES = SQUARES_LIST;
export const EMPTY_BOARD = new Map<Square, Piece>();
export const startingBoard = startingBoardMap;
export const STARTING_POSITION = STARTING_POSITION_OBJ;
