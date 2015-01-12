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
  if (!node || !node.type) return undefined;
  return this['visit' + node.type](node);
};

Compiler.prototype.visitCase = function(node) {
  return {
    type: 'switch',
    expression: node.expr,
    children: this.visit(node.block),
    line: node.line,
    filename: node.filename,
    buffer: true
  }
};

Compiler.prototype.visitWhen = function(node) {
  return {
    type: node.expr === 'default' ? 'default' : 'case',
    expression: node.expr !== 'default' ? node.expr : undefined,
    children: this.visit(node.block),
    line: node.line,
    filename: node.filename,
    buffer: true
  };
};

Compiler.prototype.visitLiteral = function(node) {
  return {
    type: 'expression',
    expression: node.str,
    buffer: node.buffer,
    escape: node.escape,
    line: node.line,
    filename: node.filename
  };
};

Compiler.prototype.visitBlock = function(node) {
  var length = node.nodes.length;

  var ast = [];

  for (var i = 0; i < length; ++i) {
    var out = this.visit(node.nodes[i]);
    if (out) ast.push(out);
  }
  return ast;
};

Compiler.prototype.visitMixinBlock = function(node, ast) {
  // TODO
  throw errorAtNode(node, new Error('Mixins are not supported at this time'));
};

Compiler.prototype.visitDoctype = function(node, ast) {
  // TODO
  throw errorAtNode(node, new Error('Doctypes are not supported at this time'));
};

Compiler.prototype.visitMixin = function(node, ast) {
  // TODO
  throw errorAtNode(node, new Error('Mixins are not supported at this time'));
};

Compiler.prototype.visitTag = function(node, ast) {
  var self = this;
  var name = node.name;

  if (node.selfClosing &&
      node.block &&
      !(node.block.type === 'Block' && node.block.nodes.length === 0) &&
      node.block.nodes.some(function(tag) {
        return tag.type !== 'Text' || !/^\s*$/.test(tag.val)
      })) {
    throw errorAtNode(node, new Error(name + ' is self closing and should not have content.'));
  }

  if (name === 't') return self.visitTranslation(node, ast);
  if (name === 'import') return self.visitImport(node, ast);
  if (name === 'var') return self.visitVar(node, ast);

  var attrs = node.attrs.slice();

  var children = (node.block && node.block.nodes.length && node.block.nodes || (node.code ? [node.code] : [])).reduce(function(acc, child) {
    if (child.type !== 'Block' || !child.name) acc.push(self.visit(child));
    else attrs.push({name: child.name, val: self.visit(child), block: true, args: child.args});
    return acc;
  }, []);

  var el = {
    type: 'tag',
    name: name,
    props: this.visitAttributes(attrs, node.attributeBlocks),
    children: children,
    line: node.line,
    filename: node.filename,
    buffer: true
  };

  return el;
};

Compiler.prototype.visitImport = function(node, ast) {
  return {
    type: 'import',
    expression: node.block.nodes[0].val,
    line: node.line,
    filename: node.filename
  };
};

Compiler.prototype.visitVar = function(node, ast) {
  return {
    type: 'var',
    expression: node.block.nodes[0].val,
    line: node.line,
    filename: node.filename
  };
};

Compiler.prototype.visitFilter = function(node, ast) {
  // TODO
  throw errorAtNode(node, new Error('Filters are not supported at this time'));
};

Compiler.prototype.visitText = function(node, ast) {
  if (!node.val) return false;
  // TODO interpolation
  // TODO unescape html expressions
  return {
    type: 'text',
    expression: JSON.stringify(node.val),
    line: node.line,
    filename: node.filename,
    buffer: true
  };
};

Compiler.prototype.visitTranslation = function(node, ast) {
  var self = this;
  var attrs = node.attrs.slice();

  var children = (node.block && node.block.nodes.length && node.block.nodes || (node.code ? [node.code] : [])).map(function(child) {
    if (child.type !== 'Block') throw errorAtNode(node, new Error('Invalid child for translation'));
    var name = child.name;
    if (!name) throw errorAtNode(node, new Error('Block missing name'));

    attrs.push({
      name: name,
      val: self.visit(child),
      block: true
    });
  });

  var el = {
    type: 'tag',
    name: 't',
    props: this.visitAttributes(attrs, node.attributeBlocks, true),
    children: children,
    line: node.line,
    filename: node.filename,
    buffer: true
  };

  return el;
};

Compiler.prototype.visitComment = function(node, ast) {
  return {
    type: node.buffer ? 'comment' : 'js_comment',
    value: node.val,
    line: node.line,
    filename: node.filename
  };
};

Compiler.prototype.visitBlockComment = function(node, ast) {
  var value = node.block.nodes.map(function(comment) {
    return comment.val;
  }).join('\n');
  return {
    type: node.buffer ? 'comment' : 'js_comment',
    value: value,
    line: node.line,
    filename: node.filename
  };
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
      type: 'if',
      expression: expr,
      children: children,
      line: node.line,
      filename: node.filename
    };
  case 'NIF':
    return {
      type: 'unless',
      expression: expr,
      children: children,
      line: node.line,
      filename: node.filename
    };
  case 'ELF':
    return {
      type: 'elseif',
      expression: expr,
      children: children,
      line: node.line,
      filename: node.filename
    };
  case 'ELS':
    return {
      type: 'else',
      children: children,
      line: node.line,
      filename: node.filename
    };
  case 'EXP':
    return {
      type: 'expression',
      buffer: node.buffer,
      expression: expr,
      escape: node.escape,
      line: node.line,
      filename: node.filename
    };
  }
  throw node;
};

Compiler.prototype.visitEach = function(node, ast) {
  var parts = node.val.split(/ +in +/);

  if (parts.length === 1) return {
    type: 'for',
    expression: node.val.replace(/^ *\(/, '').replace(/\) *$/, ''),
    children: node.block && this.visit(node.block),
    buffer: true
  };

  var kv = parts[0].split(/ *\, */);

  return {
    type: 'each',
    key: (kv[1] || node.key).trim(),
    value: kv[0].trim(),
    expression: parts[1].trim(),
    children: node.block && this.visit(node.block),
    buffer: true
  };
};

Compiler.prototype.visitYield = function(node, ast) {
  return {
    type: 'yield',
    line: node.line,
    filename: node.filename,
    name: node.val,
    args: node.args
  };
};

Compiler.prototype.visitAttributes = function(attrs, blocks, isTranslate) {
  var classes = [];

  var out = attrs.reduce(function(acc, attr, i) {
    if (attr.name === 'class') {
      classes.push(attr.val);
    } else if (isTranslate && i == 0 && attr.val === true) {
      acc.path = {
        expression: JSON.stringify(attr.name),
        escaped: attr.escaped,
        args: attr.args
      };
    } else {
      acc[attr.name] = {
        expression: attr.val,
        escaped: attr.escaped,
        args: attr.args
      };
    }
    return acc;
  }, {});

  if (classes.length) {
    out['class'] = {
      expressions: classes
    };
  }

  return out;
};

function errorAtNode(node, error) {
  error.line = node.line;
  error.filename = node.filename;
  return error;
}
