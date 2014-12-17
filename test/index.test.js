var should = require('should');
var dir = require('fs').readdirSync;
var compile = require('..').file;

/**
 * Initialization
 */

var root = __dirname;

var cases = dir(root + '/cases').map(function(name) {
  var path = root + '/cases/' + name;
  return {
    input: path + '/index.jade',
    output: path + '/index.js',
    name: name
  };
});

describe('jade2directiv', function(){
  describe('cases', function() {
    cases.forEach(function(test) {
      it('should support ' + test.name, function() {
        var out = compile(test.input);
        console.log(JSON.stringify(out, null, '  '))
        // out.should.eql(require(test.output));
      });
    });
  });
});
