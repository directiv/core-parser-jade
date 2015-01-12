/**
 * Module dependencies
 */

var jade = require('jade');
var inherits = require('util').inherits;
var Lexer = require('./lexer');

module.exports = Parser;

function Parser(str, filename, options) {
  jade.Parser.apply(this, arguments);
  this.lexer = new Lexer(this.input, filename);
}
inherits(Parser, jade.Parser);

Parser.prototype.parseExpr = function() {
  if (this.peek().type !== 'yield') return jade.Parser.prototype.parseExpr.apply(this, arguments);
  var tok = this.expect('yield');
  return {
    type: 'Yield',
    val: tok.val,
    line: tok.line,
    args: tok.args
  };
};

Parser.prototype.parseBlock = function() {
  var tok = this.peek();
  var block = jade.Parser.prototype.parseBlock.apply(this, arguments);
  block.args = tok.args;
  return block;
};
