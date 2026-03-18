import { startingBoard } from './constants.js';
import {
  ATTACKS,
  DIFF_OFFSET,
  OFF_BOARD,
  PIECE_MASKS,
  RAYS,
  boardFromMap,
  squareToIndex,
} from './internal/index.js';

import type { CastlingRights, Color, Piece, Square } from './types.js';

interface PositionOptions {
  castlingRights?: CastlingRights;
  enPassantSquare?: Square;
  fullmoveNumber?: number;
  halfmoveClock?: number;
  turn?: Color;
}

const DEFAULT_OPTIONS: Required<Omit<PositionOptions, 'enPassantSquare'>> &
  Pick<PositionOptions, 'enPassantSquare'> = {
  castlingRights: { bK: true, bQ: true, wK: true, wQ: true },
  enPassantSquare: undefined,
  fullmoveNumber: 1,
  halfmoveClock: 0,
  turn: 'w',
};

export class Position {
  readonly #board: Map<Square, Piece>;
  readonly #castlingRights: CastlingRights;
  readonly #enPassantSquare: Square | undefined;
  readonly #fullmoveNumber: number;
  readonly #halfmoveClock: number;
  readonly #turn: Color;

  constructor(board?: Map<Square, Piece>, options?: PositionOptions) {
    this.#board = new Map(board ?? startingBoard);
    const options_ = { ...DEFAULT_OPTIONS, ...options };
    this.#castlingRights = options_.castlingRights;
    this.#enPassantSquare = options_.enPassantSquare;
    this.#fullmoveNumber = options_.fullmoveNumber;
    this.#halfmoveClock = options_.halfmoveClock;
    this.#turn = options_.turn;
  }

  get castlingRights(): CastlingRights {
    return this.#castlingRights;
  }

  get enPassantSquare(): Square | undefined {
    return this.#enPassantSquare;
  }

  get fullmoveNumber(): number {
    return this.#fullmoveNumber;
  }

  get halfmoveClock(): number {
    return this.#halfmoveClock;
  }

  get isCheck(): boolean {
    for (const [square, p] of this.#board) {
      if (p.type === 'k' && p.color === this.#turn) {
        const opponent: Color = this.#turn === 'w' ? 'b' : 'w';
        return this.isAttacked(square, opponent);
      }
    }
    return false;
  }

  get turn(): Color {
    return this.#turn;
  }

  #isAttackedByPiece(
    board: (Piece | undefined)[],
    targetIndex: number,
    fromIndex: number,
    p: Piece,
    by: Color,
  ): boolean {
    const diff = targetIndex - fromIndex;
    const tableIndex = diff + DIFF_OFFSET;

    if (tableIndex < 0 || tableIndex >= 240) {
      return false;
    }

    const attackMask = ATTACKS[tableIndex] ?? 0;
    const pieceMask = PIECE_MASKS[p.type] ?? 0;

    if ((attackMask & pieceMask) === 0) {
      return false;
    }

    if (p.type === 'p') {
      if (by === 'w' && diff > 0) {
        return false;
      }

      if (by === 'b' && diff < 0) {
        return false;
      }
    }

    const ray = RAYS[tableIndex] ?? 0;

    if (ray === 0) {
      return true;
    }

    let index = fromIndex + ray;
    while (index !== targetIndex) {
      if ((index & OFF_BOARD) !== 0) {
        return false;
      }

      if (board[index] !== undefined) {
        return false;
      }

      index += ray;
    }

    return true;
  }

  attackers(square: Square, by: Color): Square[] {
    const board = boardFromMap(this.#board);
    const targetIndex = squareToIndex(square);
    const result: Square[] = [];

    for (const [sq, p] of this.#board) {
      if (p.color !== by) {
        continue;
      }

      const fromIndex = squareToIndex(sq);
      if (this.#isAttackedByPiece(board, targetIndex, fromIndex, p, by)) {
        result.push(sq);
      }
    }

    return result;
  }

  findPiece(piece: Piece): Square[] {
    const result: Square[] = [];
    for (const [sq, p] of this.#board) {
      if (p.color === piece.color && p.type === piece.type) {
        result.push(sq);
      }
    }
    return result;
  }

  isAttacked(square: Square, by: Color): boolean {
    const board = boardFromMap(this.#board);
    const targetIndex = squareToIndex(square);

    for (const [sq, p] of this.#board) {
      if (p.color !== by) {
        continue;
      }

      const fromIndex = squareToIndex(sq);
      if (this.#isAttackedByPiece(board, targetIndex, fromIndex, p, by)) {
        return true;
      }
    }

    return false;
  }

  piece(square: Square): Piece | undefined {
    return this.#board.get(square);
  }

  pieces(color?: Color): Map<Square, Piece> {
    if (color === undefined) {
      return new Map(this.#board);
    }
    const result = new Map<Square, Piece>();
    for (const [sq, p] of this.#board) {
      if (p.color === color) {
        result.set(sq, p);
      }
    }
    return result;
  }
}
