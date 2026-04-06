import {
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
} from './board.js';
import {
  BISHOP_MOVES,
  KING_MOVES,
  KNIGHT_MOVES,
  PAWN_MOVES,
  ROOK_MOVES,
} from './moves.js';
import { squareColor } from './squares.js';
import { castlingHash, epHash, pieceHash, turnHash } from './zobrist.js';

import type {
  CastlingRights,
  Color,
  DeriveOptions,
  EnPassantSquare,
  File,
  Piece,
  PieceMove,
  PieceType,
  PositionOptions,
  Square,
} from './types.js';

const DEFAULT_OPTIONS: Required<Omit<PositionOptions, 'enPassantSquare'>> &
  Pick<PositionOptions, 'enPassantSquare'> = {
  castlingRights: {
    black: { king: true, queen: true },
    white: { king: true, queen: true },
  },
  enPassantSquare: undefined,
  fullmoveNumber: 1,
  halfmoveClock: 0,
  turn: 'white',
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

export class Position {
  readonly castlingRights: CastlingRights;
  readonly enPassantSquare: EnPassantSquare | undefined;
  readonly fullmoveNumber: number;
  readonly halfmoveClock: number;
  readonly turn: Color;

  #board: number[];
  #hash: string | undefined;
  #isCheck: boolean | undefined;

  constructor(board?: Map<Square, Piece>, options?: PositionOptions) {
    this.#board = Array.from<unknown, number>({ length: 128 }, () => 0);

    if (board !== undefined) {
      for (const [square, p] of board) {
        this.#board[squareToIndex(square)] = pieceToBitmask(p);
      }
    }

    const options_ = { ...DEFAULT_OPTIONS, ...options };
    this.castlingRights = options_.castlingRights;
    this.enPassantSquare = options_.enPassantSquare;
    this.fullmoveNumber = options_.fullmoveNumber;
    this.halfmoveClock = options_.halfmoveClock;
    this.turn = options_.turn;
  }

  static #from(
    board: number[],
    options: {
      castlingRights: CastlingRights;
      enPassantSquare: EnPassantSquare | undefined;
      fullmoveNumber: number;
      halfmoveClock: number;
      turn: Color;
    },
  ): Position {
    const pos = new Position(undefined, options);
    pos.#board = board;
    pos.#hash = undefined;
    pos.#isCheck = undefined;
    return pos;
  }

  get hash(): string {
    if (this.#hash !== undefined) {
      return this.#hash;
    }

    let h = 0n;

    for (let index = 0; index < 128; index++) {
      if (index & OFF_BOARD) {
        index += 7;
        continue;
      }
      const value = this.#board[index] ?? 0;
      if (value === 0) {
        continue;
      }
      const sq = indexToSquare(index);
      const type = NUM_TO_PIECE_TYPE[value & TYPE_MASK] ?? 'pawn';
      const color: Color = (value & COLOR_MASK) === 0 ? 'white' : 'black';
      h ^= pieceHash(sq, type, color);
    }

    h ^= turnHash(this.turn);

    for (const [color, sides] of Object.entries(this.castlingRights) as [
      Color,
      { king: boolean; queen: boolean },
    ][]) {
      for (const [side, active] of Object.entries(sides) as [
        'king' | 'queen',
        boolean,
      ][]) {
        if (active) {
          h ^= castlingHash(color, side);
        }
      }
    }

    if (this.enPassantSquare !== undefined) {
      const file = this.enPassantSquare[0] as File;
      h ^= epHash(file);
    }

    this.#hash = h.toString(16).padStart(16, '0');
    return this.#hash;
  }

  get isInsufficientMaterial(): boolean {
    const nonKingPieces: { index: number; type: number }[] = [];

    for (let index = 0; index < 128; index++) {
      if (index & OFF_BOARD) {
        index += 7;
        continue;
      }
      const value = this.#board[index] ?? 0;
      if (value === 0) {
        continue;
      }
      const type = value & TYPE_MASK;
      if (type !== KING) {
        nonKingPieces.push({ index: index, type });
      }
    }

    if (nonKingPieces.length === 0) {
      return true;
    }

    if (nonKingPieces.length === 1) {
      const first = nonKingPieces[0];
      if (first === undefined) return false;
      return first.type === BISHOP || first.type === KNIGHT;
    }

    const allBishops = nonKingPieces.every((p) => p.type === BISHOP);
    if (allBishops) {
      const firstPiece = nonKingPieces[0];
      if (firstPiece === undefined) return false;
      const firstSq = indexToSquare(firstPiece.index);
      const firstColor = squareColor(firstSq);
      return nonKingPieces.every(
        (p) => squareColor(indexToSquare(p.index)) === firstColor,
      );
    }

    return false;
  }

  get isValid(): boolean {
    let blackKings = 0;
    let whiteKings = 0;

    for (let index = 0; index < 128; index++) {
      if (index & OFF_BOARD) {
        index += 7;
        continue;
      }
      const value = this.#board[index] ?? 0;
      if (value === 0) {
        continue;
      }
      const type = value & TYPE_MASK;

      if (type === KING) {
        if ((value & COLOR_MASK) === 0) {
          whiteKings++;
        } else {
          blackKings++;
        }
      }

      if (type === PAWN) {
        const rank = 8 - ((index >> 4) & 0x07);
        if (rank === 1 || rank === 8) {
          return false;
        }
      }
    }

    if (blackKings !== 1 || whiteKings !== 1) {
      return false;
    }

    const opponentColor = this.turn === 'white' ? BLACK : WHITE;
    const opponentKingBitmask = opponentColor | KING;
    let opponentKingIndex = -1;
    for (let index = 0; index < 128; index++) {
      if (index & OFF_BOARD) {
        index += 7;
        continue;
      }
      if (this.#board[index] === opponentKingBitmask) {
        opponentKingIndex = index;
        break;
      }
    }

    if (opponentKingIndex === -1) {
      return false;
    }

    return !this.#isAttackedBy(
      opponentKingIndex,
      this.turn === 'white' ? WHITE : BLACK,
    );
  }

  get isCheck(): boolean {
    if (this.#isCheck !== undefined) {
      return this.#isCheck;
    }

    const myColor = this.turn === 'white' ? WHITE : BLACK;
    const myKingBitmask = myColor | KING;
    let kingIndex = -1;
    for (let index = 0; index < 128; index++) {
      if (index & OFF_BOARD) {
        index += 7;
        continue;
      }
      if (this.#board[index] === myKingBitmask) {
        kingIndex = index;
        break;
      }
    }

    this.#isCheck =
      kingIndex !== -1 &&
      this.#isAttackedBy(kingIndex, myColor === WHITE ? BLACK : WHITE);
    return this.#isCheck;
  }

  #isAttackedBy(targetIndex: number, byColor: number): boolean {
    const enemyKnight = byColor | KNIGHT;
    for (const move of KNIGHT_MOVES) {
      const index = targetIndex + move.offset;
      if (!(index & OFF_BOARD) && this.#board[index] === enemyKnight) {
        return true;
      }
    }

    const enemyRook = byColor | ROOK;
    const enemyQueen = byColor | QUEEN;
    for (const move of ROOK_MOVES) {
      let index = targetIndex + move.offset;
      while (!(index & OFF_BOARD)) {
        const value = this.#board[index] ?? 0;
        if (value !== 0) {
          if (value === enemyRook || value === enemyQueen) {
            return true;
          }
          break;
        }
        index += move.offset;
      }
    }

    const enemyBishop = byColor | BISHOP;
    for (const move of BISHOP_MOVES) {
      let index = targetIndex + move.offset;
      while (!(index & OFF_BOARD)) {
        const value = this.#board[index] ?? 0;
        if (value !== 0) {
          if (value === enemyBishop || value === enemyQueen) {
            return true;
          }
          break;
        }
        index += move.offset;
      }
    }

    const enemyKing = byColor | KING;
    for (const move of KING_MOVES) {
      const index = targetIndex + move.offset;
      if (!(index & OFF_BOARD) && this.#board[index] === enemyKing) {
        return true;
      }
    }

    const pawnMoves =
      byColor === BLACK ? PAWN_MOVES.black.captures : PAWN_MOVES.white.captures;
    const enemyPawn = byColor | PAWN;
    for (const move of pawnMoves) {
      const index = targetIndex + move.offset;
      if (!(index & OFF_BOARD) && this.#board[index] === enemyPawn) {
        return true;
      }
    }

    return false;
  }

  derive(changes?: DeriveOptions): Position {
    const board = [...this.#board];

    if (changes?.changes) {
      for (const [square, p] of changes.changes) {
        const index = squareToIndex(square);
        board[index] = p === undefined ? 0 : pieceToBitmask(p);
      }
    }

    return Position.#from(board, {
      castlingRights: changes?.castlingRights ?? this.castlingRights,
      enPassantSquare:
        'enPassantSquare' in (changes ?? {})
          ? changes?.enPassantSquare
          : this.enPassantSquare,
      fullmoveNumber: changes?.fullmoveNumber ?? this.fullmoveNumber,
      halfmoveClock: changes?.halfmoveClock ?? this.halfmoveClock,
      turn: changes?.turn ?? this.turn,
    });
  }

  reach(square: Square, move: PieceMove): Square[] {
    const fromIndex = squareToIndex(square);
    let index = fromIndex + move.offset;

    if ((index & OFF_BOARD) !== 0) {
      return [];
    }

    if (!move.slide) {
      return [indexToSquare(index)];
    }

    const result: Square[] = [];

    while ((index & OFF_BOARD) === 0) {
      result.push(indexToSquare(index));

      if (this.#board[index] !== 0) {
        break;
      }

      index += move.offset;
    }

    return result;
  }

  piece(square: Square): Piece | undefined {
    return bitmaskToPiece(this.#board[squareToIndex(square)] ?? 0);
  }

  pieces(color?: Color): Map<Square, Piece> {
    const result = new Map<Square, Piece>();
    const colorFilter =
      color === undefined ? undefined : color === 'black' ? BLACK : WHITE;

    for (let index = 0; index < 128; index++) {
      if (index & OFF_BOARD) {
        index += 7;
        continue;
      }
      const value = this.#board[index] ?? 0;
      if (value === 0) {
        continue;
      }
      if (colorFilter !== undefined && (value & COLOR_MASK) !== colorFilter) {
        continue;
      }
      const p = bitmaskToPiece(value);
      if (p !== undefined) {
        result.set(indexToSquare(index), p);
      }
    }

    return result;
  }
}
