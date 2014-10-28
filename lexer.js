/**
 * Module dependencies
 */

var jade = require('jade');
var inherits = require('util').inherits;

module.exports = Lexer;

function Lexer() {
  jade.Lexer.apply(this, arguments);
}
inherits(Lexer, jade.Lexer);

Lexer.prototype.conditional = function() {
  var captures;
  if (captures = /^(if|unless|else if|else)\b([^\n]*)/.exec(this.input)) {
    this.consume(captures[0].length);
    var type = captures[1]
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
