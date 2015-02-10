/**
 * Module dependencies
 */

var jade = require('jade');
var inherits = require('util').inherits;
var Compiler = require('./compiler');
var Parser = require('./parser');

exports = module.exports = function(str, opts) {
  opts = opts || {};
  opts.compiler = Compiler;
  opts.parser = Parser;
  opts.self = true;
  return jade.compile(str, opts)();
};

Compiler.prototype.compileString = exports;

exports.file = function(path, opts) {
  opts = opts || {};
  opts.compiler = Compiler;
  opts.parser = Parser;
  opts.self = true;
  return jade.compileFile(path, opts)();
};
