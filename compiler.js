/**
 * Module dependencies
 */

var capture = require('./lib/capture');

module.exports = Compiler;

function Compiler(node, opts) {
  this.opts = opts = opts || {};
  this.node = node;
}

Compiler.prototype.compile = function() {
  var ast = this.visit(this.node);
  return 'return ' + JSON.stringify(ast) + ';';
};

Compiler.prototype.visit = function(node, parent) {
  if (!node || !node.type) return undefined;
  return this['visit' + node.type](node, parent);
};

Compiler.prototype.visitCase = function(node) {
  return {
    type: 'switch',
    expression: node.expr,
    children: this.visit(node.block),
    line: node.line,
    filename: node.filename,
    buffer: true
  };
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
    this.mergeChildren(ast, out);
  }

  if (!node.name || node.name.indexOf('!') !== 0 || node.isSubBlock) return ast;

  return {
    type: 'named_block',
    name: node.name,
    children: ast,
    line: node.line,
    filename: node.filename,
    args: node.args
  };
};

Compiler.prototype.mergeChildren = function(acc, child) {
  if (!child) return acc;
  if (Array.isArray(child)) acc.push.apply(acc, child);
  else acc.push(child);
  return acc;
};

Compiler.prototype.visitMixinBlock = function(node) {
  // TODO
  throw errorAtNode(node, new Error('Mixins are not supported at this time'));
};

Compiler.prototype.visitDoctype = function(node) {
  // TODO
  throw errorAtNode(node, new Error('Doctypes are not supported at this time'));
};

Compiler.prototype.visitMixin = function(node) {
  // TODO
  throw errorAtNode(node, new Error('Mixins are not supported at this time'));
};

Compiler.prototype.visitTag = function(node) {
  var self = this;
  var name = node.name;

  if (node.selfClosing &&
      node.block &&
      !(node.block.type === 'Block' && node.block.nodes.length === 0) &&
      node.block.nodes.some(function(tag) {
        return tag.type !== 'Text' || !/^\s*$/.test(tag.val);
      })) {
    throw errorAtNode(node, new Error(name + ' is self closing and should not have content.'));
  }

  if (name === 't') return self.visitTranslation(node);
  if (name === 'import') return self.visitImport(node);
  if (name === 'var') return self.visitVar(node);
  if (name === 'const') return self.visitConst(node);
  if (name === 'export') return self.visitExport(node);
  if (name === 'function') return self.visitFunction(node);

  var attrs = node.attrs.slice();

  var children = this.visitChildren(node, attrs);

  return {
    type: 'tag',
    name: name,
    props: this.visitAttributes(attrs, node.attributeBlocks),
    children: children,
    line: node.line,
    filename: node.filename,
    buffer: true
  };
};

Compiler.prototype.visitChildren = function(node, attrs) {
  var self = this;
  var parent = node.name;
  var children = (node.block && node.block.nodes.length && node.block.nodes || (node.code ? [node.code] : []));
  return children.reduce(function(acc, child) {
    var name = child.args && child.name;
    var c = self.visit(addParentClass(parent, name, child));
    if (child.type !== 'Block' || !child.name) self.mergeChildren(acc, c);
    else attrs.push({name: child.name, val: c, block: true, args: child.args});
    return acc;
  }, []);
};

Compiler.prototype.visitImport = function(node) {
  return {
    type: 'import',
    expression: nodesToExpr(node),
    line: node.line,
    filename: node.filename
  };
};

Compiler.prototype.visitExport = function(node) {
  return {
    type: 'export',
    expression: nodesToExpr(node),
    line: node.line,
    filename: node.filename
  };
};

Compiler.prototype.visitFunction = function(node) {
  var nodes = node.block.nodes;
  var first = nodes[0];

  var children = nodes.slice(1);

  return {
    type: 'function',
    expression: first.val,
    children: this.visitBlock({nodes: children}),
    buffer: false
  };
};

Compiler.prototype.visitVar = function(node) {
  return {
    type: 'var',
    expression: nodesToExpr(node),
    line: node.line,
    filename: node.filename
  };
};

Compiler.prototype.visitConst = function(node) {
  return {
    type: 'const',
    expression: nodesToExpr(node),
    line: node.line,
    filename: node.filename
  };
};

Compiler.prototype.visitFilter = function(filter) {
  if (filter.name === 'capture') return capture(filter, this);
  var text = filter.block.nodes.map(
    function(node){ return node.val; }
  ).join('\n');

  return {
    type: 'filter',
    name: filter.name,
    attrs: filter.attrs,
    content: text,
    line: filter.line,
    filename: filter.filename
  };
};

Compiler.prototype.visitText = function(node) {
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

Compiler.prototype.visitTranslation = function(node) {
  var self = this;
  var attrs = node.attrs.slice();

  var children = (node.block && node.block.nodes.length && node.block.nodes || (node.code ? [node.code] : [])).map(function(child) {
    if (child.type !== 'Block') throw errorAtNode(node, new Error('Invalid child for translation'));
    var name = child.name;
    if (!name) throw errorAtNode(node, new Error('Block missing name'));

    var visited = self.visit(child);

    if (visited.length === 1) visited[0].props.key = {name: name, expression: JSON.stringify(name)};

    attrs.push({
      name: name,
      val: visited,
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

Compiler.prototype.visitComment = function(node) {
  return {
    type: node.buffer ? 'comment' : 'js_comment',
    value: node.val,
    line: node.line,
    filename: node.filename
  };
};

Compiler.prototype.visitBlockComment = function(node) {
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

Compiler.prototype.visitEach = function(node) {
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

Compiler.prototype.visitYield = function(node) {
  return {
    type: 'yield',
    line: node.line,
    filename: node.filename,
    name: node.val,
    args: node.args
  };
};

Compiler.prototype.visitAttributes = function(attrs, blocks, isTranslate) {
  var styles = [];
  var classes = [];

  var out = attrs.reduce(function(acc, attr, i) {
    if (attr.name === 'class' || attr.name === 'className') {
      classes.push(attr.val);
    } else if (attr.name === 'style') {
      styles.push(attr.val);
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

  if (styles.length) {
    out.style = {
      expressions: styles
    };
  }

  if (classes.length) {
    out['class'] = {
      expressions: classes
    };
  }

  if (blocks && blocks.length) {
    out['&props'] = {
      expressions: blocks
    };
  }

  return out;
};

function errorAtNode(node, error) {
  error.line = node.line;
  error.filename = node.filename;
  return error;
}

function nodesToExpr(node) {
  return node.block.nodes.map(function(n) {
    return n.val;
  }).join('\n');
}

function addParentClass(parent, block, child) {
  if (child && child.nodes) {
    child.nodes = addParentClassToChildren(parent, child.name, child.nodes);
    return child;
  }
  if ((child.type === 'Code' || child.type === 'Each') && child.block && child.block.nodes) {
    child.block.nodes = addParentClassToChildren(parent, block, child.block.nodes);
    return child;
  }

  // only apply block classes to PascalCase tags
  var first = parent.charAt(0);
  if (first !== first.toUpperCase()) return child;

  // wrap text nodes in a span
  if (child.type === 'Text') child = {
    type: 'Tag',
    name: 'span',
    attributeNames: [],
    attrs: [],
    attributeBlocks: [],
    block: {nodes: [child]},
    selfClosing: false,
    line: child.line,
    filename: child.filename
  };

  if (!child || !Array.isArray(child.attrs)) return child;

  var name = parent + '-block';
  if (block) name += '-' + block;
  child.attrs.push({
    name: 'class',
    val: JSON.stringify(name)
  });
  return child;
}

function addParentClassToChildren(parent, block, children) {
  return (children || []).map(addParentClass.bind(null, parent, block));
}
