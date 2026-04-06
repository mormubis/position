import { OFF_BOARD, boardFromMap, squareToIndex } from './board.js';
import {
  BISHOP_MOVES,
  KING_MOVES,
  KNIGHT_MOVES,
  PAWN_MOVES,
  ROOK_MOVES,
} from './moves.js';
import { squareColor } from './squares.js';
import { startingBoard } from './starting-board.js';
import {
  CASTLING_TABLE,
  EP_TABLE,
  PIECE_TABLE,
  TURN_TABLE,
} from './zobrist.js';

import type {
  CastlingRights,
  Color,
  DeriveOptions,
  EnPassantSquare,
  File,
  Piece,
  PieceMove,
  PositionOptions,
  Square,
} from './types.js';

const FILES = 'abcdefgh';

function indexToSquare(index: number): Square {
  const file = index & 0x07;
  const rank = 8 - ((index >> 4) & 0x07);
  return `${FILES[file]}${rank}` as Square;
}

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
  readonly #board: Map<Square, Piece>;
  readonly #castlingRights: CastlingRights;
  readonly #enPassantSquare: EnPassantSquare | undefined;
  readonly #fullmoveNumber: number;
  readonly #halfmoveClock: number;
  #board0x88: (Piece | undefined)[] | undefined;
  #hash: string | undefined;
  #isCheckCache: boolean | undefined;
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

  /**
   * Game turn counter — starts at `1` and increments after each black move.
   */
  get fullmoveNumber(): number {
    return this.#fullmoveNumber;
  }

  /**
   * Number of half-moves since the last pawn advance or capture. Resets on
   * every pawn move or capture. A draw can be claimed when it reaches `100`.
   */
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

    for (const [color, sides] of Object.entries(this.#castlingRights) as [
      string,
      { king: boolean; queen: boolean },
    ][]) {
      for (const [side, active] of Object.entries(sides) as [
        string,
        boolean,
      ][]) {
        if (active) {
          h ^= CASTLING_TABLE[`${color}.${side}`] ?? 0n;
        }
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
    if (this.#computeIsAttacked(opponent)) {
      return false;
    }

    return true;
  }

  /** Whether the side to move is in check. */
  get isCheck(): boolean {
    if (this.#isCheckCache !== undefined) {
      return this.#isCheckCache;
    }
    this.#isCheckCache = this.#computeIsAttacked(this.#turn);
    return this.#isCheckCache;
  }

  /** Side to move — `'white'` or `'black'`. */
  get turn(): Color {
    return this.#turn;
  }

  #getBoard0x88(): (Piece | undefined)[] {
    if (this.#board0x88 !== undefined) {
      return this.#board0x88;
    }
    this.#board0x88 = boardFromMap(this.#board);
    return this.#board0x88;
  }

  #computeIsAttacked(kingColor: Color): boolean {
    // Find king
    let kingSquare: Square | undefined;
    for (const [sq, p] of this.#board) {
      if (p.type === 'king' && p.color === kingColor) {
        kingSquare = sq;
        break;
      }
    }

    if (kingSquare === undefined) {
      return false;
    }

    const opponent: Color = kingColor === 'white' ? 'black' : 'white';

    // Knight attacks
    for (const move of KNIGHT_MOVES) {
      const [target] = this.reach(kingSquare, move);
      if (target !== undefined) {
        const piece = this.#board.get(target);
        if (piece?.color === opponent && piece.type === 'knight') {
          return true;
        }
      }
    }

    // Rook/Queen attacks (rank and file)
    for (const move of ROOK_MOVES) {
      const squares = this.reach(kingSquare, move);
      for (const sq of squares) {
        const piece = this.#board.get(sq);
        if (piece !== undefined) {
          if (
            piece.color === opponent &&
            (piece.type === 'rook' || piece.type === 'queen')
          ) {
            return true;
          }
          break;
        }
      }
    }

    // Bishop/Queen attacks (diagonals)
    for (const move of BISHOP_MOVES) {
      const squares = this.reach(kingSquare, move);
      for (const sq of squares) {
        const piece = this.#board.get(sq);
        if (piece !== undefined) {
          if (
            piece.color === opponent &&
            (piece.type === 'bishop' || piece.type === 'queen')
          ) {
            return true;
          }
          break;
        }
      }
    }

    // King attacks (adjacent)
    for (const move of KING_MOVES) {
      const [target] = this.reach(kingSquare, move);
      if (target !== undefined) {
        const piece = this.#board.get(target);
        if (piece?.color === opponent && piece.type === 'king') {
          return true;
        }
      }
    }

    // Pawn attacks — from king's perspective, look for enemy pawns
    // If king is white, look in the directions black pawns would capture FROM
    // Black pawns capture with offsets +15, +17 — so from white king, look at +15, +17
    const pawnMoves =
      kingColor === 'white'
        ? PAWN_MOVES.black.captures
        : PAWN_MOVES.white.captures;
    for (const move of pawnMoves) {
      const [target] = this.reach(kingSquare, move);
      if (target !== undefined) {
        const piece = this.#board.get(target);
        if (piece?.color === opponent && piece.type === 'pawn') {
          return true;
        }
      }
    }

    return false;
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
   * From `square`, apply the move descriptor and return the squares reached.
   *
   * For single-hop moves, returns the target square if it is on the board
   * (regardless of occupancy), or an empty array if off-board.
   *
   * For sliding moves, walks step by step collecting every square until
   * hitting off-board or an occupied square. The first occupied square is
   * included (it could be a capture target).
   *
   * @param square - The source square.
   * @param move - A {@link PieceMove} descriptor with offset and optional slide flag.
   */
  reach(square: Square, move: PieceMove): Square[] {
    const board = this.#getBoard0x88();
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

      if (board[index] !== undefined) {
        break;
      }

      index += move.offset;
    }

    return result;
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
