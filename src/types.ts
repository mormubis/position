/** Side to move — `'white'` or `'black'`. */
type Color = 'black' | 'white';

/** Board file (column), `'a'` through `'h'`. */
type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';

/** Chess piece type: bishop, king, knight, pawn, queen, or rook. */
type PieceType = 'bishop' | 'king' | 'knight' | 'pawn' | 'queen' | 'rook';

/** Board rank (row), `'1'` through `'8'`. */
type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

/** En passant target square — always on rank 3 or rank 6. */
type EnPassantSquare = `${File}${'3' | '6'}`;

/**
 * A board square, e.g. `'e4'`. Combination of {@link File} and {@link Rank}.
 *
 * @preventExpand
 */
type Square = `${File}${Rank}`;

/** Castling availability for one side. */
interface SideCastlingRights {
  /** Can castle kingside. */
  king: boolean;
  /** Can castle queenside. */
  queen: boolean;
}

/** Which castling moves remain available for each side. */
interface CastlingRights {
  /** Black's castling rights. */
  black: SideCastlingRights;
  /** White's castling rights. */
  white: SideCastlingRights;
}

/**
 * Options accepted by {@link Position.derive}. Extends {@link PositionOptions}
 * with a `changes` field for applying piece changes.
 */
interface DeriveOptions extends PositionOptions {
  /**
   * Piece changes as `[square, piece]` tuples. Set piece to `undefined` to
   * clear a square. Only changed squares need to be listed.
   */
  changes?: [Square, Piece | undefined][];
}

/**
 * Options for constructing a {@link Position}. All fields are optional —
 * omitted fields use defaults (standard starting position values).
 */
interface PositionOptions {
  /** Castling availability. Defaults to all four castling moves available. */
  castlingRights?: CastlingRights;
  /** En passant target square, if any. */
  enPassantSquare?: EnPassantSquare;
  /**
   * Game turn counter — starts at `1` and increments after each black move.
   * After `1. e4 e5 2. Nf3` the fullmove number is `2`. Defaults to `1`.
   */
  fullmoveNumber?: number;
  /**
   * Number of half-moves since the last pawn advance or capture. Resets to
   * `0` on every pawn move or capture. When it reaches `100` (50 full moves
   * per side) either player may claim a draw. Defaults to `0`.
   */
  halfmoveClock?: number;
  /** Side to move. Defaults to `'white'`. */
  turn?: Color;
}

/** A piece type that a pawn can promote to — bishop, knight, queen, or rook. */
type PromotionPieceType = Exclude<PieceType, 'king' | 'pawn'>;

/** A chess move — origin square, target square, and optional promotion. */
interface Move {
  /** The square the piece moves from. */
  from: Square;
  /** The piece type to promote to, if this is a promotion move. */
  promotion?: PromotionPieceType;
  /** The square the piece moves to. */
  to: Square;
}

/** A chess piece — color and type. */
interface Piece {
  /** The piece's color. */
  color: Color;
  /** The piece's type. */
  type: PieceType;
}

/** Describes a piece movement on the 0x88 board. */
interface PieceMove {
  /** 0x88 offset for this move direction. */
  offset: number;
  /** Whether the piece slides along this direction (bishop, rook, queen). */
  slide?: boolean;
}

export type {
  CastlingRights,
  Color,
  DeriveOptions,
  EnPassantSquare,
  File,
  Move,
  Piece,
  PieceMove,
  PieceType,
  PositionOptions,
  PromotionPieceType,
  Rank,
  SideCastlingRights,
  Square,
};
