import {
  castling as castlingHash,
  enPassant as epHash,
  piece as pieceHash,
  turn as turnHash,
} from '@echecs/zobrist';

import {
  BISHOP,
  BLACK,
  COLOR_MASK,
  KING,
  KNIGHT,
  OFF_BOARD,
  PAWN,
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
  QUEEN_MOVES,
  ROOK_MOVES,
} from './moves.js';

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

const PIECE_MOVES: Record<PieceType, readonly PieceMove[]> = {
  bishop: BISHOP_MOVES,
  king: KING_MOVES,
  knight: KNIGHT_MOVES,
  pawn: [],
  queen: QUEEN_MOVES,
  rook: ROOK_MOVES,
};

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

export class Position {
  readonly castlingRights: CastlingRights;
  readonly enPassantSquare: EnPassantSquare | undefined;
  readonly fullmoveNumber: number;
  readonly halfmoveClock: number;
  readonly turn: Color;

  #board: number[];
  #hash: string | undefined;
  #isCheck: boolean | undefined;

  constructor(board?: ReadonlyMap<Square, Piece>, options?: PositionOptions) {
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
      const p = bitmaskToPiece(value);
      if (p !== undefined) {
        h ^= pieceHash(indexToSquare(index), p.type, p.color);
      }
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
      const firstParity =
        ((firstPiece.index & 0x07) + ((firstPiece.index >> 4) & 0x07)) & 1;
      return nonKingPieces.every(
        (p) =>
          (((p.index & 0x07) + ((p.index >> 4) & 0x07)) & 1) === firstParity,
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

    const opponentColor: Color = this.turn === 'white' ? 'black' : 'white';
    const opponentKingBitmask =
      (opponentColor === 'white' ? WHITE : BLACK) | KING;
    let opponentKingSquare: Square | undefined;
    for (let index = 0; index < 128; index++) {
      if (index & OFF_BOARD) {
        index += 7;
        continue;
      }
      if (this.#board[index] === opponentKingBitmask) {
        opponentKingSquare = indexToSquare(index);
        break;
      }
    }

    if (opponentKingSquare === undefined) {
      return false;
    }

    return !this.#isSquareAttackedBy(
      opponentKingSquare,
      opponentColor,
      this.turn,
    );
  }

  get isCheck(): boolean {
    if (this.#isCheck !== undefined) {
      return this.#isCheck;
    }

    const kingColor = this.turn;
    const opponent: Color = kingColor === 'white' ? 'black' : 'white';

    let kingSquare: Square | undefined;
    const kingBitmask = (kingColor === 'white' ? WHITE : BLACK) | KING;
    for (let index = 0; index < 128; index++) {
      if (index & OFF_BOARD) {
        index += 7;
        continue;
      }
      if (this.#board[index] === kingBitmask) {
        kingSquare = indexToSquare(index);
        break;
      }
    }

    if (kingSquare === undefined) {
      this.#isCheck = false;
      return false;
    }

    this.#isCheck = this.#isSquareAttackedBy(kingSquare, kingColor, opponent);
    return this.#isCheck;
  }

  #isSquareAttackedBy(
    square: Square,
    friendlyColor: Color,
    enemyColor: Color,
  ): boolean {
    for (const type of [
      'knight',
      'bishop',
      'rook',
      'queen',
      'king',
      'pawn',
    ] as PieceType[]) {
      const squares = this.reach(square, { color: friendlyColor, type });
      for (const sq of squares) {
        const p = this.piece(sq);
        if (p === undefined || p.color !== enemyColor) {
          continue;
        }
        if (type === 'rook' && (p.type === 'rook' || p.type === 'queen')) {
          return true;
        }
        if (type === 'bishop' && (p.type === 'bishop' || p.type === 'queen')) {
          return true;
        }
        if (p.type === type) {
          return true;
        }
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

  reach(square: Square, piece: Piece): Square[] {
    const fromIndex = squareToIndex(square);
    const friendlyColor = piece.color === 'black' ? BLACK : WHITE;
    const result: Square[] = [];

    if (piece.type === 'pawn') {
      const direction = piece.color === 'white' ? -16 : 16;
      const startingRank = piece.color === 'white' ? 6 : 1;
      const rank = (fromIndex >> 4) & 0x07;

      const pushIndex = fromIndex + direction;
      if (!(pushIndex & OFF_BOARD) && (this.#board[pushIndex] ?? 0) === 0) {
        result.push(indexToSquare(pushIndex));

        if (rank === startingRank) {
          const doublePushIndex = pushIndex + direction;
          if (
            !(doublePushIndex & OFF_BOARD) &&
            (this.#board[doublePushIndex] ?? 0) === 0
          ) {
            result.push(indexToSquare(doublePushIndex));
          }
        }
      }

      const epIndex =
        this.enPassantSquare === undefined
          ? -1
          : squareToIndex(this.enPassantSquare);
      for (const captureOffset of [direction - 1, direction + 1]) {
        const captureIndex = fromIndex + captureOffset;
        if (captureIndex & OFF_BOARD) {
          continue;
        }
        const value = this.#board[captureIndex] ?? 0;
        if (
          (value !== 0 && (value & COLOR_MASK) !== friendlyColor) ||
          captureIndex === epIndex
        ) {
          result.push(indexToSquare(captureIndex));
        }
      }

      return result;
    }

    const moves = PIECE_MOVES[piece.type];
    for (const move of moves) {
      let index = fromIndex + move.offset;

      if (move.slide) {
        while (!(index & OFF_BOARD)) {
          const value = this.#board[index] ?? 0;
          if (value !== 0) {
            if ((value & COLOR_MASK) !== friendlyColor) {
              result.push(indexToSquare(index));
            }
            break;
          }
          result.push(indexToSquare(index));
          index += move.offset;
        }
      } else {
        if (!(index & OFF_BOARD)) {
          const value = this.#board[index] ?? 0;
          if (value === 0 || (value & COLOR_MASK) !== friendlyColor) {
            result.push(indexToSquare(index));
          }
        }
      }
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
