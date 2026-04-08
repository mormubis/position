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

/**
 * An immutable chess position — board state, turn, castling rights,
 * en passant square, and move counters.
 *
 * Query the position with getters and methods. Produce new positions
 * with {@link Position.derive | derive}.
 */
export class Position {
  // 128-element 0x88 board. Each element is 0 (empty) or a bitmask encoding
  // piece type (bits 0-2) and color (bit 3). See board.ts for the scheme.
  #board: number[];
  #hash: string | undefined;
  #isCheck: boolean | undefined;

  /** Which castling moves remain available. */
  readonly castlingRights: CastlingRights;
  /** En passant target square (rank 3 or 6), if any. */
  readonly enPassantSquare: EnPassantSquare | undefined;
  /** Game turn counter — increments after each black move. */
  readonly fullmoveNumber: number;
  /** Half-moves since last pawn advance or capture (fifty-move rule). */
  readonly halfmoveClock: number;
  /** Side to move. */
  readonly turn: Color;

  /**
   * @param board - Piece placement. Defaults to an empty board.
   * @param options - Turn, castling rights, en passant, and move counters.
   */
  constructor(board?: ReadonlyMap<Square, Piece>, options?: PositionOptions) {
    // Internal fast path: #from() passes the raw 0x88 array directly,
    // skipping the 128-element allocation that would be immediately overwritten.
    if (Array.isArray(board)) {
      this.#board = board;
    } else {
      // eslint-disable-next-line unicorn/no-new-array -- Array.from is ~24x slower; this is a hot path
      this.#board = new Array<number>(128).fill(0);

      if (board !== undefined) {
        for (const [square, p] of board) {
          this.#board[squareToIndex(square)] = pieceToBitmask(p);
        }
      }
    }

    const options_ = { ...DEFAULT_OPTIONS, ...options };
    this.castlingRights = options_.castlingRights;
    this.enPassantSquare = options_.enPassantSquare;
    this.fullmoveNumber = options_.fullmoveNumber;
    this.halfmoveClock = options_.halfmoveClock;
    this.turn = options_.turn;
  }

  /**
   * Zobrist hash of the position as a 16-character hex string. Computed once
   * and cached. Uses the Polyglot standard keys from `@echecs/zobrist`.
   */
  get hash(): string {
    if (this.#hash !== undefined) {
      return this.#hash;
    }

    let h = 0n;

    // 0x88 iteration: indices 0-127, skip off-board slots (index & 0x88 !== 0)
    // by jumping ahead 7 positions to the next valid rank.
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

  /** Whether the side to move is in check. Computed once and cached. */
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

  /**
   * Whether the position is a draw by insufficient material (FIDE rules):
   * K vs K, K+B vs K, K+N vs K, or K+B(s) vs K+B(s) with same-color bishops.
   */
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
      // Square color from 0x88 index: file = index & 7, rank = index >> 4.
      // (file + rank) & 1 gives the parity — same parity = same color square.
      const firstParity =
        ((firstPiece.index & 0x07) + ((firstPiece.index >> 4) & 0x07)) & 1;
      return nonKingPieces.every(
        (p) =>
          (((p.index & 0x07) + ((p.index >> 4) & 0x07)) & 1) === firstParity,
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

  // Passes the raw 0x88 array directly to the constructor's internal fast
  // path (Array.isArray branch), skipping the 128-element allocation.
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
    // @ts-expect-error -- internal: overload signatures hide number[] from public API
    return new Position(board, options);
  }

  // Color trick: from the target square, call reach() pretending a friendly
  // piece of each type is there. reach() skips friendly pieces and stops at
  // enemies. If the enemy piece found matches the type we're checking, it
  // means that piece attacks the target square.
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
        const p = this.at(sq);
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

  /** Returns the piece on the given square, or `undefined` if empty. */
  at(square: Square): Piece | undefined {
    return bitmaskToPiece(this.#board[squareToIndex(square)] ?? 0);
  }

  /**
   * Returns a new position with the given changes applied. Fields not
   * provided are carried over from the source.
   */
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

  /** Returns a map of all pieces on the board, optionally filtered by color. */
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

  /**
   * From `square`, return all squares the given `piece` can reach on the
   * current board. Filters out same-color pieces. For sliding pieces, stops
   * before friendlies and includes enemy pieces. For pawns, includes pushes
   * (blocked by any piece), captures (enemy only), and en passant.
   */
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
      // Capture offsets: direction +/- 1 gives the two diagonals
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
}
