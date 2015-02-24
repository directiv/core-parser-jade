/**
 * Module dependencies
 */

var JLexer = require('jade').Lexer;
var inherits = require('util').inherits;

module.exports = Lexer;

function Lexer() {
  JLexer.apply(this, arguments);
}
inherits(Lexer, JLexer);

Lexer.prototype.conditional = function() {
  var captures;
  if (captures = /^(if|unless|else if|else)\b([^\n]*)/.exec(this.input)) {
    this.consume(captures[0].length);
    var type = captures[1];
    var js = captures[2];
    var isIf = false;
    var isElse = false;

    switch (type) {
    case 'if':
      js = 'IFF' + js;
      isIf = true;
      break;
    case 'unless':
      js = 'NIF' + js;
      isIf = true;
      break;
    case 'else if':
      js = 'ELF' + js;
      isIf = true;
      isElse = true;
      break;
    case 'else':
      if (js && js.trim()) {
        throw new Error('`else` cannot have a condition, perhaps you meant `else if`');
      }
      js = 'ELS';
      isElse = true;
      break;
    }
    var tok = this.tok('code', js);
    tok.isElse = isElse;
    tok.isIf = isIf;
    tok.requiresBlock = true;
    return tok;
  }
};

Lexer.prototype.each = function() {
  var captures;
  if (captures = /^(?:- *)?(?:each|for|repeat) +([^\n]+)/.exec(this.input)) {
    this.consume(captures[0].length);
    var tok = this.tok('each', captures[1]);
    tok.key = captures[2] || '$index';
    tok.code = captures[3];
    return tok;
  }
};

Lexer.prototype.code = function() {
  var captures;
  if (captures = /^(!?=|-)[ \t]*([^\n]+)/.exec(this.input)) {
    this.consume(captures[0].length);
    var flags = captures[1];
    captures[1] = captures[2];
    var tok = this.tok('code', 'EXP' + captures[1]);
    tok.escape = flags.charAt(0) === '=';
    tok.buffer = flags.charAt(0) === '=' || flags.charAt(1) === '=';
    return tok;
  }
};

Lexer.prototype['yield'] = function() {
  var captures = /^yield\b *([^\n]+)?/.exec(this.input);
  if (captures) {
    this.consume(captures[0].length);
    var name = captures[1];

    var parts = (name || '').split(/ *\( */);

    var tok = this.tok('yield', parts[0]);

    if (parts[1]) tok.args = '(' + parts[1];

    return tok;
  }
};

Lexer.prototype.block = function() {
  var captures = /^block\b *(?:(prepend|append) +)?([^\n]+)/.exec(this.input);
  if (captures) {
    this.consume(captures[0].length);
    var mode = captures[1] || 'replace';
    var name = captures[2];

    var parts = (name || '').split(/ *\( */);

    var tok = this.tok('block', parts[0]);

    if (parts[1]) tok.args = '(' + parts[1];

    tok.mode = mode;
    return tok;
  }
};

Lexer.prototype.attributesBlock = function() {
  var captures;
  if (/^&props\b/.test(this.input)) {
    this.consume('&props'.length);
    var args = this.bracketExpression();
    this.consume(args.end + 1);
    return this.tok('&attributes', args.src);
  }
};
