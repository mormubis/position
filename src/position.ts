import { startingBoard } from './constants.js';

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

  get turn(): Color {
    return this.#turn;
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
