/**
 * @fileoverview Tokenizes and evaluates a math expression using recursive descent.
 * Supports: +, -, *, /, %, ^, parentheses, decimals, unary minus.
 * Attaches to __ins_events._evalMathExpr.
 */
// ui/inspector/events/mathEval.js
// MUST LOAD BEFORE: ui/inspector/events/paramChange.js

var __ins_events = __ins_events || {};

(function() {

  /**
   * Tokenizes and evaluates a math expression using recursive descent.
   * Supports: +, -, *, /, %, ^, parentheses, decimals, unary minus.
   * @param {string} str The math expression string.
   * @return {number|null} The evaluated result, or null if invalid.
   */
  function _evalMathExpr(str) {
    if (typeof str !== 'string') return null;
    var s = str.trim().replace(/\s/g, '');
    if (s === '') return null;
    if (!/^[\d+\-*/().,%^]+$/.test(s)) return null;
    if (!/[+\-*/%^]/.test(s)) return null;

    // Tokenize
    var tokens = [];
    var i = 0;
    while (i < s.length) {
      var ch = s[i];
      if (ch >= '0' && ch <= '9') {
        var num = '';
        while (i < s.length && ((s[i] >= '0' && s[i] <= '9') || s[i] === '.')) {
          num += s[i];
          i++;
        }
        tokens.push({ t: 'num', v: parseFloat(num) });
      } else if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%' || ch === '^') {
        tokens.push({ t: 'op', v: ch });
        i++;
      } else if (ch === '(' || ch === ')') {
        tokens.push({ t: ch === '(' ? 'lp' : 'rp', v: ch });
        i++;
      } else {
        return null;
      }
    }

    // Handle unary minus: convert '-num' or '(-num' patterns
    var j = 0;
    while (j < tokens.length) {
      if (tokens[j].t === 'op' && tokens[j].v === '-') {
        var prev = j > 0 ? tokens[j-1] : null;
        if (!prev || prev.t === 'lp' || (prev.t === 'op' && prev.v !== ')')) {
          tokens[j].unary = true;
        }
      }
      j++;
    }

    var pos = 0;
    function peek() { return pos < tokens.length ? tokens[pos] : null; }
    function consume() { return pos < tokens.length ? tokens[pos++] : null; }

    function parseExpr() {
      var left = parseTerm();
      while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
        var op = consume().v;
        var right = parseTerm();
        if (right === null) return null;
        left = op === '+' ? left + right : left - right;
      }
      return left;
    }

    function parseTerm() {
      var left = parseFactor();
      while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/' || peek().v === '%')) {
        var op = consume().v;
        var right = parseFactor();
        if (right === null) return null;
        if (op === '*') left = left * right;
        else if (op === '/') left = right !== 0 ? left / right : 0;
        else left = left % right;
      }
      return left;
    }

    function parseFactor() {
      if (!peek()) return null;
      if (peek().t === 'num') {
        var tok = consume();
        // Handle ^ (right-associative)
        if (peek() && peek().t === 'op' && peek().v === '^') {
          consume();
          var exp = parseFactor();
          if (exp === null) return null;
          return Math.pow(tok.v, exp);
        }
        return tok.v;
      }
      if (peek().t === 'lp') {
        consume(); // '('
        var val = parseExpr();
        if (!peek() || peek().t !== 'rp') return null;
        consume(); // ')'
        // Handle ^ after parenthesized expression
        if (peek() && peek().t === 'op' && peek().v === '^') {
          consume();
          var exp2 = parseFactor();
          if (exp2 === null) return null;
          return Math.pow(val, exp2);
        }
        return val;
      }
      if (peek().t === 'op' && peek().unary) {
        consume(); // '-'
        var operand = parseFactor();
        if (operand === null) return null;
        return -operand;
      }
      return null;
    }

    var result = parseExpr();
    if (result === null || pos !== tokens.length) return null;
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return result;
  }

  __ins_events._evalMathExpr = _evalMathExpr;

})();
