module.exports = function(filter, compiler) {
  var text = filter.block.nodes.map(
    function(node){ return node.val; }
  ).join('\n');

  // TODO add line offset
  var children = compiler.compileString(text, this.opts);

  var attrs = filter.attrs;

  var target = attrs.as || 'capture';
  var str = attrs.unquote ? formatChildrenAsString(children, 0) : s(text);

  children.unshift({
    type: 'var',
    expression: target + ' = ' + str + ';',
    line: filter.line,
    filename: filter.filename
  });

  return children;
};

function formatChildrenAsString(children, i) {
  return (children || []).map(function(child) {
    var fn = types[child.type];
    if (!fn) return '';
    return fn(child, i);
  }).join(' + "\\n" + ');
}

var types = {
  tag: function(node, i) {
    return indent(i) + s(node.name + '(') + ' + ' + formatProps(node.props) + ' + ")\\n" + ' + formatChildrenAsString(node.children, i + 1);
  },
  expression: function(node, i) {
    return indent(i) + '"= " + JSON.stringify(' + node.expression + ')';
  },
  'import': function(node, i) {
    return indent(i) + '"import " + ' + s(node.expression);
  },
  'export': function(node, i) {
    return indent(i) + '"export " + ' + s(node.expression);
  },
  'var': function(node, i) {
    return indent(i) + '"var " + ' + s(node.expression);
  },
  'text': function(node, i) {
    return indent(i) + '"| " + ' + node.expression;
  }
};

function formatProps(props) {
  return Object.keys(props).map(function(key) {
    var val = props[key];
    if (key === 'class') return '"class=" + JSON.stringify(' + val.expressions.join(' ') + ')';
    return s(key + '=') + ' + JSON.stringify(' + val.expression + ')';
  }).join(' + " " + ');
}

function s(str) {
  return JSON.stringify(str);
}

function indent(levels) {
  for(var ws = '', i = 0; i < levels; i++) {
    ws += '  ';
  }
  return s(ws) + ' + ';
}
