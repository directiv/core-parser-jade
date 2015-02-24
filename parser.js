/**
 * Module dependencies
 */

var jade = require('jade');
var inherits = require('util').inherits;
var Lexer = require('./lexer');
var Attrs = require('jade/lib/nodes/attrs');

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
  delete this.blocks[block.name];
  block.args = tok.args;
  return block;
};

Attrs.prototype.setAttribute = function(name, val, escaped) {
  if (name !== 'class' && name !== 'className' && name !== 'style' && this.attributeNames.indexOf(name) !== -1) {
    throw new Error('Duplicate attribute "' + name + '" is not allowed.');
  }
  this.attributeNames.push(name);
  this.attrs.push({ name: name, val: val, escaped: escaped });
  return this;
};
