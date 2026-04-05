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

/** Square color on the board — `'dark'` or `'light'`. */
type SquareColor = 'dark' | 'light';

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
  /** Fullmove counter. Increments after black's move. Defaults to `1`. */
  fullmoveNumber?: number;
  /** Halfmove clock for the fifty-move rule. Defaults to `0`. */
  halfmoveClock?: number;
  /** Side to move. Defaults to `'white'`. */
  turn?: Color;
}

/** A chess piece — color and type. */
interface Piece {
  /** The piece's color. */
  color: Color;
  /** The piece's type. */
  type: PieceType;
}

export type {
  CastlingRights,
  Color,
  DeriveOptions,
  EnPassantSquare,
  File,
  Piece,
  PieceType,
  PositionOptions,
  Rank,
  SideCastlingRights,
  Square,
  SquareColor,
};
