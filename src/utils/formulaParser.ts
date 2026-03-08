/**
 * Formula Parser — Recursive Descent
 *
 * Supported syntax:
 *   Arithmetic:   =A1+B2*3-C4/2
 *   Parentheses:  =(A1+B2)*C3
 *   Cell refs:    =A1, =B10
 *   Ranges:       =A1:A10 (only inside functions)
 *   Functions:    =SUM(A1:A5), =AVERAGE(A1:A5,B1), =COUNT(A1:A5),
 *                 =MIN(A1:A5), =MAX(A1:A5), =IF(condition,then,else)
 *   Nested:       =SUM(A1:A3)+B4*2
 *   Comparison:   =A1>B1, =A1=B1 (returns 1 or 0)
 *
 * Design rationale: A hand-written recursive descent parser gives us full
 * control over error messages, circular-reference detection, and is trivially
 * extensible. An eval()-based approach would be unsafe; a library would be
 * over-engineered for this scope.
 */

import { expandRange, idToAddress, isValidCellId } from "./cellUtils";
import type { FormulaResult } from "../types";

// ─── Tokeniser ────────────────────────────────────────────────────────────────

type TokenType =
  | "NUMBER"
  | "STRING"
  | "CELL_REF"
  | "IDENT"
  | "PLUS"
  | "MINUS"
  | "STAR"
  | "SLASH"
  | "PERCENT"
  | "CARET"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "COLON"
  | "EQ"
  | "NEQ"
  | "LT"
  | "LTE"
  | "GT"
  | "GTE"
  | "CONCAT"
  | "EOF";

interface Token {
  type: TokenType;
  value: string;
}

function tokenise(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    const ch = input[pos];

    // Whitespace
    if (/\s/.test(ch)) { pos++; continue; }

    // Numbers
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(input[pos + 1] ?? ""))) {
      let num = "";
      while (pos < input.length && /[0-9.]/.test(input[pos])) num += input[pos++];
      tokens.push({ type: "NUMBER", value: num });
      continue;
    }

    // String literals (double-quoted)
    if (ch === '"') {
      pos++;
      let str = "";
      while (pos < input.length && input[pos] !== '"') {
        if (input[pos] === "\\" && input[pos + 1] === '"') { str += '"'; pos += 2; }
        else str += input[pos++];
      }
      pos++; // consume closing "
      tokens.push({ type: "STRING", value: str });
      continue;
    }

    // Identifiers and cell refs (e.g. A1, SUM, IF, TRUE, FALSE)
    if (/[A-Za-z_]/.test(ch)) {
      let ident = "";
      while (pos < input.length && /[A-Za-z0-9_]/.test(input[pos])) ident += input[pos++];
      const upper = ident.toUpperCase();
      if (isValidCellId(upper)) {
        tokens.push({ type: "CELL_REF", value: upper });
      } else {
        tokens.push({ type: "IDENT", value: upper });
      }
      continue;
    }

    // Operators
    switch (ch) {
      case "+": tokens.push({ type: "PLUS", value: "+" }); pos++; break;
      case "-": tokens.push({ type: "MINUS", value: "-" }); pos++; break;
      case "*": tokens.push({ type: "STAR", value: "*" }); pos++; break;
      case "/": tokens.push({ type: "SLASH", value: "/" }); pos++; break;
      case "%": tokens.push({ type: "PERCENT", value: "%" }); pos++; break;
      case "^": tokens.push({ type: "CARET", value: "^" }); pos++; break;
      case "(": tokens.push({ type: "LPAREN", value: "(" }); pos++; break;
      case ")": tokens.push({ type: "RPAREN", value: ")" }); pos++; break;
      case ",": tokens.push({ type: "COMMA", value: "," }); pos++; break;
      case ":": tokens.push({ type: "COLON", value: ":" }); pos++; break;
      case "&": tokens.push({ type: "CONCAT", value: "&" }); pos++; break;
      case "=":
        if (input[pos + 1] === "=") { tokens.push({ type: "EQ", value: "==" }); pos += 2; }
        else { tokens.push({ type: "EQ", value: "=" }); pos++; }
        break;
      case "<":
        if (input[pos + 1] === "=") { tokens.push({ type: "LTE", value: "<=" }); pos += 2; }
        else if (input[pos + 1] === ">") { tokens.push({ type: "NEQ", value: "<>" }); pos += 2; }
        else { tokens.push({ type: "LT", value: "<" }); pos++; }
        break;
      case ">":
        if (input[pos + 1] === "=") { tokens.push({ type: "GTE", value: ">=" }); pos += 2; }
        else { tokens.push({ type: "GT", value: ">" }); pos++; }
        break;
      default:
        pos++; // skip unknown
    }
  }

  tokens.push({ type: "EOF", value: "" });
  return tokens;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

type CellGetter = (cellId: string) => FormulaResult;

class Parser {
  private tokens: Token[];
  private pos = 0;
  private getCellValue: CellGetter;
  private visitedCells: Set<string>;

  constructor(
    tokens: Token[],
    getCellValue: CellGetter,
    visitedCells: Set<string>
  ) {
    this.tokens = tokens;
    this.getCellValue = getCellValue;
    this.visitedCells = visitedCells;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  private expect(type: TokenType): Token {
    const t = this.consume();
    if (t.type !== type) throw new Error(`Expected ${type}, got ${t.type}`);
    return t;
  }

  // comparison → concat (("=" | "<>" | "<" | ">" | "<=" | ">=") concat)*
  parseExpr(): FormulaResult {
    let left = this.parseConcat();
    while (
      ["EQ", "NEQ", "LT", "LTE", "GT", "GTE"].includes(this.peek().type)
    ) {
      const op = this.consume().value;
      const right = this.parseConcat();
      const l = toNum(left);
      const r = toNum(right);
      switch (op) {
        case "=":
        case "==":
          left = l === r ? 1 : 0;
          break;
        case "<>":
          left = l !== r ? 1 : 0;
          break;
        case "<":
          left = l < r ? 1 : 0;
          break;
        case "<=":
          left = l <= r ? 1 : 0;
          break;
        case ">":
          left = l > r ? 1 : 0;
          break;
        case ">=":
          left = l >= r ? 1 : 0;
          break;
      }
    }
    return left;
  }

  // concat → additive ("&" additive)*
  parseConcat(): FormulaResult {
    let left = this.parseAdditive();
    while (this.peek().type === "CONCAT") {
      this.consume();
      const right = this.parseAdditive();
      left = String(left ?? "") + String(right ?? "");
    }
    return left;
  }

  // additive → multiplicative (('+' | '-') multiplicative)*
  parseAdditive(): FormulaResult {
    let left = this.parseMultiplicative();
    while (["PLUS", "MINUS"].includes(this.peek().type)) {
      const op = this.consume().type;
      const right = this.parseMultiplicative();
      left =
        op === "PLUS" ? toNum(left) + toNum(right) : toNum(left) - toNum(right);
    }
    return left;
  }

  // multiplicative → power (('*' | '/' | '%') power)*
  parseMultiplicative(): FormulaResult {
    let left = this.parsePower();
    while (["STAR", "SLASH", "PERCENT"].includes(this.peek().type)) {
      const op = this.consume().type;
      const right = this.parsePower();
      if (op === "STAR") left = toNum(left) * toNum(right);
      else if (op === "SLASH") {
        const r = toNum(right);
        left = r === 0 ? "#DIV/0!" : toNum(left) / r;
      } else {
        left = toNum(left) % toNum(right);
      }
    }
    return left;
  }

  // power → unary ('^' unary)*
  parsePower(): FormulaResult {
    let base = this.parseUnary();
    if (this.peek().type === "CARET") {
      this.consume();
      const exp = this.parseUnary();
      base = Math.pow(toNum(base), toNum(exp));
    }
    return base;
  }

  // unary → ('-' | '+') unary | primary
  parseUnary(): FormulaResult {
    if (this.peek().type === "MINUS") {
      this.consume();
      return -toNum(this.parseUnary());
    }
    if (this.peek().type === "PLUS") {
      this.consume();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  // primary → NUMBER | STRING | cell_ref | function_call | '(' expr ')' | bool
  parsePrimary(): FormulaResult {
    const t = this.peek();

    if (t.type === "NUMBER") {
      this.consume();
      return parseFloat(t.value);
    }

    if (t.type === "STRING") {
      this.consume();
      return t.value;
    }

    if (t.type === "CELL_REF") {
      this.consume();
      // Check for range: CELL_REF ':' CELL_REF (e.g. standalone A1:A5 is unusual but handle)
      if (this.peek().type === "COLON") {
        this.consume();
        const endRef = this.expect("CELL_REF").value;
        const ids = expandRange(`${t.value}:${endRef}`);
        const nums = ids.flatMap((id) => {
          const v = this.resolveCell(id);
          const n = toNum(v);
          return isNaN(n) ? [] : [n];
        });
        return nums.reduce((a, b) => a + b, 0); // default range = sum
      }
      return this.resolveCell(t.value);
    }

    if (t.type === "IDENT") {
      const name = t.value;

      // Boolean literals
      if (name === "TRUE") { this.consume(); return 1; }
      if (name === "FALSE") { this.consume(); return 0; }

      // Function call
      if (this.tokens[this.pos + 1]?.type === "LPAREN" || this.tokens[this.pos]?.type === "IDENT") {
        if (this.peek().type === "IDENT") {
          this.consume(); // consume function name
          if (this.peek().type === "LPAREN") {
            return this.parseFunctionCall(name);
          }
          return null;
        }
      }
      this.consume();
      return null;
    }

    if (t.type === "LPAREN") {
      this.consume();
      const val = this.parseExpr();
      this.expect("RPAREN");
      return val;
    }

    // Unknown token — skip it
    this.consume();
    return null;
  }

  private parseFunctionCall(name: string): FormulaResult {
    this.expect("LPAREN");
    const args = this.parseArgs();
    this.expect("RPAREN");

    switch (name) {
      case "SUM":
       
      case "AVERAGE": {
        const nums = args.flat().filter((v) => !isNaN(toNum(v)));
        if (nums.length === 0) return "#DIV/0!";
        return nums.reduce((a: number, b) => a + toNum(b), 0) / nums.length;
      }

      case "COUNT":
        return args.flat().filter((v) => v !== null && v !== "").length;

      case "COUNTA":
        return args.flat().filter((v) => v !== null && v !== "" && String(v).trim() !== "").length;

      case "MIN": {
        const ns = args.flat().map(toNum).filter((n) => !isNaN(n));
        return ns.length ? Math.min(...ns) : 0;
      }

      case "MAX": {
        const ns = args.flat().map(toNum).filter((n) => !isNaN(n));
        return ns.length ? Math.max(...ns) : 0;
      }

      case "ABS":
        return Math.abs(toNum(args[0]?.[0] ?? null));

      case "ROUND": {
        const [val, digits] = args;
        const d = toNum(digits?.[0] ?? null) || 0;
        return Math.round(toNum(val?.[0] ?? null) * Math.pow(10, d)) / Math.pow(10, d);
      }

      case "SQRT":
        return Math.sqrt(toNum(args[0]?.[0] ?? null));

      case "IF": {
        const [cond, thenVal, elseVal] = args;
        return toNum(cond?.[0] ?? null) !== 0 ? (thenVal?.[0] ?? null) : (elseVal?.[0] ?? null);
      }

      case "CONCAT":
        return args.flat().map((v) => String(v ?? "")).join("");

      case "LEN":
        return String(args[0]?.[0] ?? "").length;

      case "UPPER":
        return String(args[0]?.[0] ?? "").toUpperCase();

      case "LOWER":
        return String(args[0]?.[0] ?? "").toLowerCase();

      case "TRIM":
        return String(args[0]?.[0] ?? "").trim();

      default:
        return `#NAME?`;
    }
  }

  /**
   * Parse comma-separated arguments. Each argument can be a range (returning
   * an array of values) or an expression (returning a single value).
   * Returns FormulaResult[][]
   */
  private parseArgs(): FormulaResult[][] {
    const args: FormulaResult[][] = [];
    if (this.peek().type === "RPAREN") return args;

    args.push(this.parseArg());
    while (this.peek().type === "COMMA") {
      this.consume();
      args.push(this.parseArg());
    }
    return args;
  }

  private parseArg(): FormulaResult[] {
    // Check if this arg is a range: CELL_REF ':' CELL_REF
    if (
      this.peek().type === "CELL_REF" &&
      this.tokens[this.pos + 1]?.type === "COLON" &&
      this.tokens[this.pos + 2]?.type === "CELL_REF"
    ) {
      const start = this.consume().value;
      this.consume(); // ':'
      const end = this.consume().value;
      const ids = expandRange(`${start}:${end}`);
      return ids.map((id) => this.resolveCell(id));
    }
    return [this.parseExpr()];
  }

  private resolveCell(id: string): FormulaResult {
    if (this.visitedCells.has(id)) return "#CIRC!";
    return this.getCellValue(id);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: FormulaResult): number {
  if (v === null || v === "") return 0;
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Evaluate a formula string.
 *
 * @param raw          The raw cell value (e.g. "=SUM(A1:A3)+2")
 * @param getCellValue Function to resolve referenced cell values
 * @param currentCell  The cell being evaluated (for circular ref detection)
 */
export function evaluateFormula(
  raw: string,
  getCellValue: CellGetter,
  currentCell?: string
): FormulaResult {
  if (!raw.startsWith("=")) {
    // Not a formula — return as number if possible, else string
    const n = parseFloat(raw);
    return isNaN(n) ? raw : n;
  }

  const formula = raw.slice(1).trim();
  if (!formula) return null;

  try {
    const visited = new Set<string>(currentCell ? [currentCell] : []);
    const tokens = tokenise(formula);
    const parser = new Parser(tokens, getCellValue, visited);
    const result = parser.parseExpr();

    if (typeof result === "number") {
      // Round floating point noise
      const rounded = Math.round(result * 1e10) / 1e10;
      return rounded;
    }
    return result;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("#")) {
      return err.message;
    }
    return "#ERROR!";
  }
}

/**
 * Check if a raw value is a formula
 */
export function isFormula(raw: string): boolean {
  return raw.startsWith("=");
}

/**
 * Validate address string used inside formula parser
 */
export { idToAddress };
