/**
 * Module dependencies
 */

var jade = require('jade');
var inherits = require('util').inherits;
var Compiler = require('./compiler');
var Parser = require('./parser');

module.exports = function(str, opts) {
  opts = opts || {};
  opts.compiler = Compiler;
  opts.parser = Parser;
  opts.self = true;
  return jade.compile(str, opts)();
};
