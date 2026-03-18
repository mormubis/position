import {
  ATTACKS,
  CASTLING_TABLE,
  DIFF_OFFSET,
  EP_TABLE,
  OFF_BOARD,
  PIECE_MASKS,
  PIECE_TABLE,
  RAYS,
  TURN_TABLE,
  boardFromMap,
  squareToIndex,
} from './internal/index.js';
import { startingBoard } from './starting-board.js';

import type { CastlingRights, Color, File, Piece, Square } from './types.js';

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
  #hash: string | undefined;
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

  get hash(): string {
    if (this.#hash !== undefined) {
      return this.#hash;
    }

    let h = 0n;

    for (const [sq, p] of this.#board) {
      h ^= PIECE_TABLE[sq]?.[p.type]?.[p.color] ?? 0n;
    }

    h ^= TURN_TABLE[this.#turn];

    for (const [right, active] of Object.entries(this.#castlingRights) as [
      string,
      boolean,
    ][]) {
      if (active) {
        h ^= CASTLING_TABLE[right] ?? 0n;
      }
    }

    if (this.#enPassantSquare !== undefined) {
      const file = this.#enPassantSquare[0] as File;
      h ^= EP_TABLE[file];
    }

    this.#hash = h.toString(16).padStart(16, '0');
    return this.#hash;
  }

  get isInsufficientMaterial(): boolean {
    const nonKing: Piece[] = [];
    for (const p of this.#board.values()) {
      if (p.type !== 'k') {
        nonKing.push(p);
      }
    }

    // K vs K
    if (nonKing.length === 0) {
      return true;
    }

    // K vs KB or K vs KN
    if (nonKing.length === 1) {
      const [sole] = nonKing;
      return sole?.type === 'b' || sole?.type === 'n';
    }

    return false;
  }

  get isValid(): boolean {
    let blackKings = 0;
    let whiteKings = 0;

    for (const [square, p] of this.#board) {
      if (p.type === 'k') {
        if (p.color === 'b') {
          blackKings++;
        } else {
          whiteKings++;
        }
      }

      // No pawns on rank 1 or 8
      if (p.type === 'p' && (square[1] === '1' || square[1] === '8')) {
        return false;
      }
    }

    if (blackKings !== 1 || whiteKings !== 1) {
      return false;
    }

    // Side not to move must not be in check
    const opponent: Color = this.#turn === 'w' ? 'b' : 'w';
    for (const [square, p] of this.#board) {
      if (
        p.type === 'k' &&
        p.color === opponent &&
        this.isAttacked(square, this.#turn)
      ) {
        return false;
      }
    }

    return true;
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
