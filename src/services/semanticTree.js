Controller.open(function(_) {
  _.exportSemanticTree = function() {
    var tree = this.semanticTreeObject();
    if (tree) {
      return tree.toString();
    }
    else {
      return '';
    }
  };
  _.semanticTreeObject = function() {
    return this.root.toSemanticNode();
  };
  _.debugSemanticTree = function() {
    var semanticNodes = this.root.toSemanticNodes();
    var output = '[';
    for (var i = 0; i < semanticNodes.length; i++) {
      output += semanticNodes[i].toString() + ',';
    }
    output += ']';
    return output;
  };
});

var SETS = {
  INTEGER: 1,
  REAL: 2,
  COMPLEX: 3,
  CONSTANT: 4
};

SemanticNode = P(function(_) {
  _.__type__ = 'SemanticNode';	
  _.init = function() {
    this.type = this.__type__;
    this.displayNodes = [];
  };
  _.is = function (typeName) {
    var currProto = this.__proto__;
    var currName = currProto.__type__;
    while(currName) {
      if (currName === typeName) {
        return true;
      }
      currProto = currProto.__proto__;
      currName = currProto.__type__;
    }
    return false;
  };

  _.toSemanticNodes = function () {
    return [this];
  };

  _.preprocess = function (rightNode) {
    return null;
  };

  _.findDisplayNode = function(displayId) {
    var index = -1;
    for (var i = 0; i < this.displayNodes.length; i++) {
      if (displayId == this.displayNodes[i].id)
        index = i;
    }
    if (index != -1) {
      return this;
    } else {
      var children = this.children();
      for (var i = 0; i < children.length; i++) {
        var findInChild = children[i].findDisplayNode(displayId);
        if (findInChild) {
          return findInChild;
        }
      }
    }
    return null;
  };

  _.getDisplayNodes = function() {
    if (this.displayNodes.length > 0) {
      return this.displayNodes;
    } else {
      var childrenDisplayNodes = [];
      var children = this.children();
      for (var i = 0; i < children.length; i++) {
        childrenDisplayNodes = childrenDisplayNodes.concat(children[i].getDisplayNodes());
      }
      return childrenDisplayNodes;
    }
  };
  
  _.children = function() {
    return [];
  };
});

ApplicationNode = P(SemanticNode, function(_, super_) {
  _.__type__ = 'ApplicationNode';
  _.init = function (operator, args) {
    this.operator = operator;
    if (!Array.isArray(args)){
      args = [args];
    }
    this.args = args;
    this.setParent(this.operator, this);
    this.setParent(this.args, this);
    super_.init.call(this);
  };
  _.toString = function () {
    return this.operator.format(this.args);
  };
  _.setParent = function(nodes, parent) {
    if (Array.isArray(nodes)) {
      for (var i = 0; i < nodes.length; i++) {
        this.setParent(nodes[i], parent);
      }
    } else if (nodes && typeof nodes == 'object') {
      nodes.parent = parent;
    }
  };
  _.children = function() {
    return [this.operator].concat(this.args);
  };
  _.isArgument = true;
});

SymbolNode = P(SemanticNode, function(_, super_) {
  _.__type__ = 'SymbolNode';
  _.init = function (symbol) {
    this.symbol = symbol;
    super_.init.call(this);
  };
  _.toString = function () {
    return this.symbol;
  };
});

NumberNode = P(SymbolNode, function(_, super_) {
  _.__type__ = 'NumberNode';
  _.preprocess = function (rightNode) {
    //If two numbers are next to each other, merge them.
    if (rightNode instanceof NumberNode) {
      return [NumberNode(this.symbol + rightNode.symbol)];
    }
    else if (rightNode instanceof VariableNode) {
      return [this, FunctionNode('*'), rightNode];
    }
    else {
      return null;
    }
  };
  _.toInt = function () {
    return parseInt(this.symbol);
  };
  _.toFloat = function() {
    return parseFloat(this.symbol);
  };
  _.isArgument = true;
});

VariableNode = P(SemanticNode, function(_, super_) {
  _.__type__ = 'VariableNode';
  _.init = function (variableName, variableType = SETS.REAL) {
    this.variableName = variableName;
    this.variableType = variableType;
    super_.init.call(this);
  };
  _.toString = function() {
    return this.variableName;
  };
  _.preprocess = function(rightNode) {
    if (rightNode instanceof VariableNode) {
      return [this, FunctionNode('*'), rightNode];
    }
  };
  _.isArgument = true;
});

OperatorNode = P(SymbolNode, function (_, super_) {
  _.init = function (symbol, rightAssociative = false, numExpectedArgs = 2) {
    this.rightAssociative = rightAssociative;
    this.numExpectedArgs = numExpectedArgs;
    this.format = this.formatter(symbol);
    super_.init.call(this, symbol);
  };
  _.isArgument = false;
});

FunctionNode = P(OperatorNode, function(_, super_) {
  _.__type__ = 'FunctionNode';
  _.init = function (symbol, numExpectedArgs, boundArgs = [], boundArgsFirst = true) {
    this.boundArgs = boundArgs;
    this.boundArgsFirst = boundArgsFirst;
    super_.init.call(this, symbol, true, numExpectedArgs);
  };
  _.formatter = function(symbol) {
    return function(args) {
      var output = symbol + '(';
      var allArgs = [];
      if (this.boundArgsFirst) {
        allArgs = this.boundArgs.concat(args);
      } else {
        allArgs = args.concat(this.boundArgs); 
      }
      for (var i = 0; i < allArgs.length; i++) {
        output += allArgs[i];
        if (i < allArgs.length-1)
          output += ',';
      }
      output += ')';
      return output;
    };
  };

  _.apply = function (siblingNodes) {
    var index = siblingNodes.indexOf(this);
    console.assert(index > -1, 'Can\'t find this node where it\'s being applied');
    if (index == siblingNodes.length - 1) {
      throw Error('Nothing to the right of the ' + this.symbol + ' function.');
    }
    var right = siblingNodes[index+1];
    var trigFunctions = ['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'sinh','cosh','tanh','sech','csch','coth'];
    if (trigFunctions.includes(this.symbol) && right instanceof ExponentNode) {
      //Special case for sin^2(x)
      var exponentPower = siblingNodes[index+2];
      if (!exponentPower) {
        throw Error('The exponent on ' + this.symbol + ' has no power.');
      }
      siblingNodes.splice(index+1, 2);
      var functionAppliedIndex = this.apply(siblingNodes);
      var functionAppliedNode = siblingNodes[functionAppliedIndex];
      var exponentApplied = ApplicationNode(right, [functionAppliedNode, exponentPower]);
      siblingNodes.splice(functionAppliedIndex, 1, exponentApplied);
      return functionAppliedIndex;
    }
    else if (!right.isArgument) {
      throw Error('Node to the right of the ' + this.symbol + ' is not an argument.');
    }

    var argumentNodes = [];
    var rightIndex = index+1;
    while (siblingNodes[rightIndex] && 
          !this.applyUntil.includes(siblingNodes[rightIndex].type)) {
      //In case we have sin(x)x, we should stop after the first application
      // and strip the brackets.
      var currNode = siblingNodes[rightIndex];
      if (currNode == right && 
          currNode instanceof ApplicationNode &&
          currNode.operator instanceof BracketNode) {
        argumentNodes.push(currNode.args[0]);
        siblingNodes.splice(rightIndex, 1);
        break;
      }
      argumentNodes.push(currNode);
      siblingNodes.splice(rightIndex, 1);
    }

    var rightApplied = parseTokenizedTree(argumentNodes);

    var applied = ApplicationNode(this, rightApplied);
    siblingNodes.splice(index, 1, applied);
    return index;
  };

  _.applyUntil = ['PlusNode', 'MinusNode'];
});

BracketNode = P(OperatorNode, function(_, super_) {
  _.__type__ = 'BracketNode';
  _.init = function() {
    super_.init.call(this, '()', true, 1);
  };
  _.formatter = function(_) {
    return function(args) {
      return '(' + args[0] + ')';
    };
  };
});

DifferentiationNode = P(FunctionNode, function(_, super_) {
  _.__type__ = 'DifferentiationNode';
  _.init = function(boundVar, degree = 1) {
    this.boundVar = boundVar;
    this.degree = degree;
    super_.init.call(this, 'd', 1, [this.boundVar, this.degree], false);
  };
});

InfixNode = P(OperatorNode, function(_, super_) {
  _.__type__ = 'InfixNode';
  _.init = function (symbol, rightAssociative = false) {
    super_.init.call(this, symbol, rightAssociative, 2);
  };
  _.formatter =  function(symbol) {
    return function(args) {
      var output = '(' + args[0].toString();  
      for (var i = 1; i < args.length; i++) {
        if (args[i]) {
          output += symbol + args[i].toString();
        }
      }
      return output + ')';
    }; 
  };
  _.apply = function (siblingNodes) {
    var index = siblingNodes.indexOf(this);
    console.assert(index > -1, 'Can\'t find this node where it\'s being applied');
    if (index == siblingNodes.length - 1) {
      throw Error('Nothing to the right of the ' + this.symbol + ' sign.');
    }
    else if (index == 0) {
      throw Error('Nothing to the left of the ' + this.symbol + ' sign.');
    }
    var left = siblingNodes[index-1], right = siblingNodes[index+1];
    if (!left.isArgument) {
      throw Error('Node to the left of the ' + this.symbol + ' is not an argument.');
    }
    if (!right.isArgument) {
      throw Error('Node to the right of the ' + this.symbol + ' is not an argument.');
    }

    var applied = ApplicationNode(this, [left, right]);
    siblingNodes.splice(index-1, 3, applied);
    return index-1;
  };
});

ExponentNode = P(InfixNode, function(_, super_) {
  _.__type__ = 'ExponentNode';
  _.init = function () {
    super_.init.call(this, '^', true);
  };
});

PlusNode = P(InfixNode, function(_, super_) {
  _.__type__ = 'PlusNode';
  _.init = function () {
    super_.init.call(this, '+');
  };
});

MinusNode = P(InfixNode, function(_, super_) {
  _.__type__ = 'MinusNode';
  _.init = function () {
    super_.init.call(this, '-');
  };
});

TimesNode = P(InfixNode, function(_, super_) {
  _.__type__ = 'TimesNode';
  _.init = function () {
    super_.init.call(this, '*');
  };
});

DivideNode = P(InfixNode, function(_, super_) {
  _.__type__ = 'DivideNode';
  _.init = function () {
    super_.init.call(this, '/');
  };
});

EqualsNode = P(InfixNode, function(_, super_) {
  _.__type__ = 'EqualsNode';
  _.init = function () {
    super_.init.call(this, '=');
  };
});

SummationNode = P(ApplicationNode, function(_, super_) {
  _.__type__ = 'SummationNode';
  _.init = function(indexVar, from, to, summand) {
    var operator = FunctionNode('sum', 4);
    var args = [];
    this.indexVar = args[0] = indexVar;
    this.from = args[1] = from;
    this.to = args[2] = to;
    this.summand = args[3] = summand;
    super_.init.call(this, operator, args);
  };
});

function tokenizeNodes(siblingNodes) {
  //Takes display tree siblings and turns them into tokenized semantic nodes
  var semanticNodes = [];
  while (siblingNodes.length > 0) {
    var currNode = siblingNodes.shift();
    var tokenizedNodes = currNode.toSemanticNodes(siblingNodes);
    semanticNodes = semanticNodes.concat(tokenizedNodes);
  }
  return semanticNodes;
}

function insertMultipliers(semanticNodes) {
  var shouldMultiply = function(node1, node2) {
    return node1.isArgument && node2.isArgument;
  };

  if (semanticNodes.length < 2) {
    return;
  }
  for (var i = 1; i < semanticNodes.length; i++) {
    var lhs = semanticNodes[i-1];
    var rhs = semanticNodes[i];
    if (shouldMultiply(lhs, rhs)) {
      semanticNodes.splice(i, 0, TimesNode());
    }
    else if(lhs instanceof MinusNode &&
            rhs.isArgument &&
            (!semanticNodes[i-2] || !semanticNodes[i-2].isArgument))
    {
      semanticNodes.splice(i-1, 1, NumberNode(-1), TimesNode());
    } 
  }
}

function parseTokenizedTree(semanticNodes) {
  var order = [
    {ops: ['FunctionNode'],             rightAssociative: true},
    {ops: ['ExponentNode'],             rightAssociative: true}, 
    {ops: ['TimesNode', 'DivideNode'],  rightAssociative: false},
    {ops: ['PlusNode', 'MinusNode'],    rightAssociative: false},
    {ops: ['EqualsNode'],               rightAssociative: true},
  ];

  var parsed = semanticNodes.slice();

  var transformMatchingNodes = (operatorSet) => {
    if (operatorSet.ops.includes('TimesNode')) {
      insertMultipliers(parsed); 
    }
    //Go forwards or backwards through the array.
    var direction = operatorSet.rightAssociative ? -1 : 1;
    for (var i = direction > 0 ? 0 : parsed.length - 1;
                 direction > 0 ? (i < parsed.length) : (i > -1); 
             i += direction) {
      var node = parsed[i];
      for (var operatorName of operatorSet.ops) {
        if (node.is(operatorName)) {
          i = node.apply(parsed);
        }
      }
    }
  };

  for (var operatorSet of order) {
    transformMatchingNodes(operatorSet);
  }

  if (parsed.length > 1) {
    throw Error('Your expression doesn\'t compress into one node');
  }

  return parsed[0];
}

Node.open(function(_) {
  _.toSemanticNodes = function(remainingNodes) {
    //Tokenize the tree into Semantic Nodes
    var semanticNodes = tokenizeNodes(this.childrenAsArray());
    var parsedTree = parseTokenizedTree(semanticNodes);
    this.appendDisplayNodes(parsedTree, [this]);
    return [parsedTree];
  };
  _.toSemanticNode = function (remainingNodes) {
    var semanticNodes = this.toSemanticNodes(remainingNodes);
    if (semanticNodes.length != 1) {
      throw Error('Couldn\'t parse into one ApplicationNode');
    } else {
      return semanticNodes[0];
    }
  };

  _.appendDisplayNodes = function (semanticNodes, displayNodes) {
    if (Array.isArray(semanticNodes)) {
      for (var i = 0; i < semanticNodes.length; i++) {
        this.appendDisplayNodes(semanticNodes[i], displayNodes);
      }
    } else if (semanticNodes && typeof semanticNodes == 'object') {
      semanticNodes.displayNodes = semanticNodes.displayNodes.concat(displayNodes);
    }
  }; 

  _.childrenAsArray = function() {
    var children = [];
    for (var currNode = this.ends[L]; currNode; currNode = currNode[R]) {
      children.push(currNode);
    }
    return children;
  };
});

Bracket.open(function (_, super_) {
  _.toSemanticNodes = function (remainingNodes) {
    var contents = super_.toSemanticNodes.call(this);
    if (contents.length > 1) {
      throw Error('Contents of brackets are malformed');
    }
    var applied = ApplicationNode(BracketNode(), contents);
    return [applied];
  };
});

BinaryOperator.open(function(_) {
  _.toSemanticNodes = function () {
    var semanticNode = null;
    switch (this.ctrlSeq) {
    case '+':
      semanticNode = PlusNode();
      break;
    case '-':
      semanticNode = MinusNode();
      break;
    case '\\div ':
      semanticNode = DivideNode();
      break;
    case '\\cdot ':
    case '\\times ':
      semanticNode = TimesNode();
      break;
    case '=':
      semanticNode = EqualsNode();
      break;
    default:
      semanticNode = InfixNode(this.ctrlSeq);
    }
    this.appendDisplayNodes(semanticNode, [this]);
    return [semanticNode];
  };
});

Superscript.open(function (_) {
  _.toSemanticNodes = function() {
    var operator = ExponentNode();
    this.appendDisplayNodes(operator, [this]);
    var superscript = this.sup.toSemanticNode();
    return [operator, superscript];
  };
});

//ALSO FUNCTIONS
Variable.open(function(_) {
  _.toSemanticNodes = function (remainingNodes) {
    var semanticNode = {};
    var displayNodes = [this];

    if (this.isPartOfOperator) {
      var symbol = this.text();
      while(remainingNodes.length > 0 &&
       remainingNodes[0].isPartOfOperator) {
        var nextNode = remainingNodes.shift();
        symbol += nextNode.text();
        displayNodes.push(nextNode);
        if (nextNode.endOfOperator){
          break;
        }
      }
      semanticNode = FunctionNode(symbol, 1);
    } 
    else {
      semanticNode = VariableNode(this.jQ[0].textContent);
    }
    this.appendDisplayNodes(semanticNode, displayNodes);
    return [semanticNode];
  };
});


NonSymbolaSymbol.open(function (_) {
  _.toSemanticNodes = function (remainingNodes) {
    var semanticNode = VariableNode(this.jQ[0].textContent);
    this.appendDisplayNodes(semanticNode, [this]);
    return [semanticNode];
  };
});

//ALSO DERIVATIVES
Fraction.open(function (_) {
  _.isDerivative = function() {
    var top = this.upInto;
    var bottom = this.downInto;
    if ((top.ends[L].ctrlSeq == 'd' && bottom.ends[L].ctrlSeq == 'd') 
        || (top.ends[L].ctrlSeq == '\\partial' && bottom.ends[L].ctrlSeq == '\\partial'))
      return true;
    return false;
  };
  _.toSemanticNodes = function(remainingNodes) {
    var semanticNode = {};
    if (this.isDerivative()) {
      //TODO: ASSERT THAT BOUNDVAR IS JUST A SYMBOL
      //TODO: SUPPORT df/dx
      var d = this.downInto.ends[L];
      var boundVar = d[R].toSemanticNode();
      var degree = 1;
      //Check for degree
      if (this.upInto.ends[R] instanceof Superscript &&
        this.downInto.ends[R] instanceof Superscript) {
        //TODO: ASSERT THAT THE SUPERSCRIPT IS THE SAME FOR BOTH
        //TODO: ASSERT THAT THE SUPERSCRIPT IS JUST A NUMBER
        var sup = this.downInto.ends[R].sup.toSemanticNode();
        if (sup instanceof NumberNode) {
          degree = sup.toInt();
        }
      }
      semanticNode = DifferentiationNode(boundVar.toString(), degree);
    } else {
      var operator = InfixNode('/');
      var args = [this.upInto.toSemanticNode(), this.downInto.toSemanticNode()];
      semanticNode = ApplicationNode(operator, args);
    }
    this.appendDisplayNodes(semanticNode, [this]);
    return [semanticNode];
  };
});

VanillaSymbol.open(function(_) {
  _.isDigit = function () {
    return !isNaN(parseInt(this.ctrlSeq)) || 
            this.ctrlSeq == '.';
  };

  _.toSemanticNodes = function (remainingNodes) {
    if (this.ctrlSeq == '\\ ') {
      return [];
    }
    else if (!this.isDigit()) {
      throw Error('Not sure what to do with this VanillaSymbol: ' + this.ctrlSeq);
    }
    var number = this.ctrlSeq;
    var displayNodes = [this];
    while (remainingNodes[0] && 
            remainingNodes[0] instanceof VanillaSymbol && 
            remainingNodes[0].isDigit()) {
      var nextNode = remainingNodes.shift();
      number += nextNode.ctrlSeq;
      displayNodes.push(nextNode);
    }
    var semanticNode = NumberNode(number);
    this.appendDisplayNodes(semanticNode, [this]);
    return [semanticNode];
  };
});

SquareRoot.open(function(_) {
  _.toSemanticNodes = function(_) {
    var symbol = 'sqrt';
    var operator = FunctionNode(symbol, 1);
    var arg = this.blocks[0].toSemanticNodes();
    var semanticNode = ApplicationNode(operator, [arg]);
    this.appendDisplayNodes(semanticNode, [this]);
    return [semanticNode];
  };
});

NthRoot.open(function (_) {
  _.toSemanticNodes = function (_) {
    var symbol = 'nthRoot';
    var operator = FunctionNode(symbol, 2);
    var args = [this.ends[R].toSemanticNodes(), this.ends[L].toSemanticNodes()];
    var semanticNode = ApplicationNode(operator, args);
    this.appendDisplayNodes(semanticNode, [this]);
    return [semanticNode];
  };
});

SummationNotation.open(function(_) {
  _.toSemanticNodes = function (remainingNodes) {
    switch (this.ctrlSeq) {
    default:
    case '\\sum':
      return this.sumSemanticNodes(remainingNodes);
    case '\\prod':
      break;
    case '\\int':
      break;
    }
  };

  _.sumSemanticNodes = function(remainingNodes) {
    //Separate the notation "i=3" into boundVar and from
    var bottom = this.downInto.toSemanticNode();
    if (!(bottom instanceof ApplicationNode)
        || bottom.operator.symbol != '=') {
      throw Error('Bottom of the summation is malformed');
    } 
    var to = this.upInto.toSemanticNode();
    var boundVar = bottom.args[0];
    var from = bottom.args[1];

    if (remainingNodes.length > 0) {
      // var summand = gobbleRightTerms(remainingNodes);
    }

    var semanticNode = SummationNode(boundVar, from, to, summand);
    this.appendDisplayNodes(semanticNode, [this]);
    return [semanticNode];
  };
});