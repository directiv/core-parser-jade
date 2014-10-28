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
