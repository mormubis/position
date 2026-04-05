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
import { squareColor } from './squares.js';
import { startingBoard } from './starting-board.js';

import type {
  CastlingRights,
  Color,
  DeriveOptions,
  EnPassantSquare,
  File,
  Piece,
  PositionOptions,
  Square,
} from './types.js';

const DEFAULT_OPTIONS: Required<Omit<PositionOptions, 'enPassantSquare'>> &
  Pick<PositionOptions, 'enPassantSquare'> = {
  castlingRights: { bK: true, bQ: true, wK: true, wQ: true },
  enPassantSquare: undefined,
  fullmoveNumber: 1,
  halfmoveClock: 0,
  turn: 'white',
};

/**
 * An immutable chess position — board state, turn, castling rights,
 * en passant square, and move counters.
 *
 * Query the position with getters and methods. Produce new positions
 * with {@link Position.derive | derive}.
 */
export class Position {
  readonly #board: Map<Square, Piece>;
  readonly #castlingRights: CastlingRights;
  readonly #enPassantSquare: EnPassantSquare | undefined;
  readonly #fullmoveNumber: number;
  readonly #halfmoveClock: number;
  #hash: string | undefined;
  readonly #turn: Color;

  /**
   * Creates a new position.
   *
   * @param board - Piece placement. Defaults to the standard starting position.
   * @param options - Turn, castling rights, en passant, and move counters.
   */
  constructor(board?: Map<Square, Piece>, options?: PositionOptions) {
    this.#board = new Map(board ?? startingBoard);
    const options_ = { ...DEFAULT_OPTIONS, ...options };
    this.#castlingRights = options_.castlingRights;
    this.#enPassantSquare = options_.enPassantSquare;
    this.#fullmoveNumber = options_.fullmoveNumber;
    this.#halfmoveClock = options_.halfmoveClock;
    this.#turn = options_.turn;
  }

  /** Which castling moves remain available. */
  get castlingRights(): CastlingRights {
    return this.#castlingRights;
  }

  /** En passant target square, or `undefined` if none. */
  get enPassantSquare(): EnPassantSquare | undefined {
    return this.#enPassantSquare;
  }

  /** Fullmove counter — increments after black's move. */
  get fullmoveNumber(): number {
    return this.#fullmoveNumber;
  }

  /** Halfmove clock for the fifty-move rule. */
  get halfmoveClock(): number {
    return this.#halfmoveClock;
  }

  /**
   * A Zobrist hash of the position as a 16-character hex string.
   * Computed once and cached. Two positions with the same hash are
   * considered identical (with negligible collision probability).
   *
   * @remarks The hash algorithm and format are not stable across major
   * versions. Do not persist hashes across version upgrades.
   */
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

  /**
   * Whether the position is a draw by insufficient material (FIDE rules):
   * K vs K, K+B vs K, K+N vs K, or K+B vs K+B with same-color bishops.
   */
  get isInsufficientMaterial(): boolean {
    const nonKingEntries: [Square, Piece][] = [];
    for (const [sq, p] of this.#board) {
      if (p.type !== 'king') {
        nonKingEntries.push([sq, p]);
      }
    }

    // K vs K
    if (nonKingEntries.length === 0) {
      return true;
    }

    // K vs KB or K vs KN
    if (nonKingEntries.length === 1) {
      const sole = nonKingEntries[0]?.[1];
      return sole?.type === 'bishop' || sole?.type === 'knight';
    }

    // KB vs KB (any number) — all non-king pieces must be bishops on the same square color
    const allBishops = nonKingEntries.every(([, p]) => p.type === 'bishop');
    if (allBishops) {
      const first = nonKingEntries[0];
      if (first === undefined) {
        return true;
      }
      const firstSquareColor = squareColor(first[0]);
      return nonKingEntries.every(
        ([sq]) => squareColor(sq) === firstSquareColor,
      );
    }

    return false;
  }

  /**
   * Whether the position is legally reachable: exactly one king per side,
   * no pawns on ranks 1 or 8, and the side not to move is not in check.
   */
  get isValid(): boolean {
    let blackKings = 0;
    let whiteKings = 0;

    for (const [square, p] of this.#board) {
      if (p.type === 'king') {
        if (p.color === 'black') {
          blackKings++;
        } else {
          whiteKings++;
        }
      }

      // No pawns on rank 1 or 8
      if (p.type === 'pawn' && (square[1] === '1' || square[1] === '8')) {
        return false;
      }
    }

    if (blackKings !== 1 || whiteKings !== 1) {
      return false;
    }

    // Side not to move must not be in check
    const opponent: Color = this.#turn === 'white' ? 'black' : 'white';
    for (const [square, p] of this.#board) {
      if (
        p.type === 'king' &&
        p.color === opponent &&
        this.isAttacked(square, this.#turn)
      ) {
        return false;
      }
    }

    return true;
  }

  /** Whether the side to move is in check. */
  get isCheck(): boolean {
    for (const [square, p] of this.#board) {
      if (p.type === 'king' && p.color === this.#turn) {
        const opponent: Color = this.#turn === 'white' ? 'black' : 'white';
        return this.isAttacked(square, opponent);
      }
    }
    return false;
  }

  /** Side to move — `'white'` or `'black'`. */
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

    if (p.type === 'pawn') {
      if (by === 'white' && diff > 0) {
        return false;
      }

      if (by === 'black' && diff < 0) {
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

  /**
   * Returns a new position with the given changes applied. Fields not
   * provided are carried over from the source. Calling with no argument
   * returns a clone.
   *
   * @param changes - Board deltas and option overrides to apply.
   */
  derive(changes?: DeriveOptions): Position {
    const board = new Map(this.#board);

    if (changes?.changes) {
      for (const [square, piece] of changes.changes) {
        if (piece === undefined) {
          board.delete(square);
        } else {
          board.set(square, piece);
        }
      }
    }

    return new Position(board, {
      castlingRights: changes?.castlingRights ?? this.#castlingRights,
      enPassantSquare:
        'enPassantSquare' in (changes ?? {})
          ? changes?.enPassantSquare
          : this.#enPassantSquare,
      fullmoveNumber: changes?.fullmoveNumber ?? this.#fullmoveNumber,
      halfmoveClock: changes?.halfmoveClock ?? this.#halfmoveClock,
      turn: changes?.turn ?? this.#turn,
    });
  }

  /**
   * Returns all squares occupied by pieces of the given color that
   * attack the target square.
   *
   * @param square - The target square.
   * @param by - The attacking color.
   */
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

  /**
   * Returns all squares occupied by the given piece.
   *
   * @param piece - The piece to find (color and type).
   */
  findPiece(piece: Piece): Square[] {
    const result: Square[] = [];
    for (const [sq, p] of this.#board) {
      if (p.color === piece.color && p.type === piece.type) {
        result.push(sq);
      }
    }
    return result;
  }

  /**
   * Returns `true` if any piece of the given color attacks the target square.
   *
   * @param square - The target square.
   * @param by - The attacking color.
   */
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

  /**
   * Returns the piece on the given square, or `undefined` if empty.
   *
   * @param square - The square to query.
   */
  piece(square: Square): Piece | undefined {
    return this.#board.get(square);
  }

  /**
   * Returns a map of all pieces on the board, optionally filtered by color.
   *
   * @param color - If provided, only pieces of this color are returned.
   */
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
