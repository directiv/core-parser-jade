module.exports = Compiler;

function Compiler(node, opts) {
  this.opts = opts = opts || {};
  this.node = node;
}

Compiler.prototype.compile = function() {
  var ast = this.visit(this.node);
  return 'return ' + JSON.stringify(ast) + ';';
};

Compiler.prototype.visit = function(node) {
  console.log('visit' + node.type);
  return this['visit' + node.type](node);
};

Compiler.prototype.visitCase = function(node) {
  // TODO
};

Compiler.prototype.visitWhen = function(node) {
  // TODO
};

Compiler.prototype.visitLiteral = function(node) {
  // TODO
};

Compiler.prototype.visitBlock = function(node) {
  var length = node.nodes.length;

  var ast = [];

  for (var i = 0; i < length; ++i) {
    ast[i] = this.visit(node.nodes[i]);
    // Multiple text nodes are separated by newlines
    // if (block.nodes[i+1] && block.nodes[i].i// sText && block.nodes[i+1].isText)
    //   this.buffer('\n');
  }
  return ast;
};

Compiler.prototype.visitMixinBlock = function(node, ast) {
  // TODO
};

Compiler.prototype.visitDoctype = function(node, ast) {
  // TODO
};

Compiler.prototype.visitMixin = function(node, ast) {
  // TODO
};

Compiler.prototype.visitTag = function(node, ast) {
  var name = node.name;

  if (node.selfClosing &&
      node.block &&
      !(node.block.type === 'Block' && node.block.nodes.length === 0) &&
      node.block.nodes.some(function(tag) {
        return tag.type !== 'Text' || !/^\s*$/.test(tag.val)
      })) {
    throw errorAtNode(node, new Error(name + ' is self closing and should not have content.'));
  }

  var el = {
    tag: name,
    props: this.visitAttributes(node.attrs, node.attributeBlocks),
    children: node.block && node.block.length && this.visit(node.block)
  };

  return el;
};

Compiler.prototype.visitFilter = function(node, ast) {
  // TODO
};

Compiler.prototype.visitText = function(node, ast) {
  // TODO
};

Compiler.prototype.visitComment = function(node, ast) {
  // TODO
};

Compiler.prototype.visitBlockComment = function(node, ast) {
  // TODO
};

Compiler.prototype.visitCode = function(node) {
  var self = this;
  var val = node.val;
  var type = val.slice(0, 3);
  var expr = val.slice(3);

  var children = self.visit(node.block);

  switch(type) {
  case 'IFF':
    return {
      tag: 'NOOP',
      childrenOnly: true,
      props: {
        'data-if': expr
      },
      children: children
    };
  case 'ELS':
    return {
      tag: 'NOOP',
      childrenOnly: true,
      props: {
        'data-if-not': expr
      },
      children: children
    };
  }
};

Compiler.prototype.visitEach = function(node, ast) {
  return {
    tag: 'NOOP',
    childrenOnly: true,
    props: {
      'data-repeat': node.val
    },
    children: node.block && this.visit(node.block)
  };
};

Compiler.prototype.visitAttributes = function(node, ast) {
  // TODO
};

function errorAtNode(node, error) {
  error.line = node.line;
  error.filename = node.filename;
  return error;
}
