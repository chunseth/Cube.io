declare class Cube {
  constructor();
  static initSolver(): void;
  static scramble(): string;
  static inverse(notation: string): string;
  move(notation: string): Cube;
  asString(): string;
  isSolved(): boolean;
  clone(): Cube;
  upright(): string;
  multiply(other: Cube): Cube;
  center: number[];
  cp: number[];
  co: number[];
  ep: number[];
  eo: number[];
}
export = Cube;
