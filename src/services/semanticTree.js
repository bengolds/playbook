Controller.open(function(_) {
  _.exportSemanticTree = function() {
    var semanticNode = this.root.toSemanticNode();
    return semanticNode.toString();
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
  _.logSemanticTree = function() {
    console.log(this.root.toSemanticNodes());
  };
  _.logDisplayTree = function() {
    console.log(this.root);
  };
});

var SETS = {
  INTEGER: 1,
  REAL: 2,
  COMPLEX: 3,
  CONSTANT: 4
};

var SemanticNode = P(function(_) {
	_.__type__ = "SemanticNode";	
	_.init = function() {
		this.type = this.__type__;
	};
  _.toSemanticNodes = function () {
    return [this];
  };

  _.preprocess = function (rightNode) {
    return null;
  }
});

var ApplicationNode = P(SemanticNode, function(_, super_) {
	_.__type__ = "ApplicationNode";
  _.init = function (operator, args) {
    this.operator = operator;
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
});

var SymbolNode = P(SemanticNode, function(_, super_) {
  _.__type__ = "SymbolNode";
  _.init = function (symbol) {
    this.symbol = symbol;
    super_.init.call(this);
  };
  _.toString = function () {
    return this.symbol;
  };
});

var NumberNode = P(SymbolNode, function(_, super_) {
  _.__type__ = "NumberNode";
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
  }
});

var OperatorNode = P(SymbolNode, function (_, super_) {
  _.init = function (symbol, rightAssociative = false, numExpectedArgs = 2) {
    this.rightAssociative = rightAssociative;
    this.numExpectedArgs = numExpectedArgs;
    this.format = this.formatter(symbol);
    super_.init.call(this, symbol);
  };
  _.comparePrecedence = function(o2) {
    var p1 = this.precedence();
    var p2 = o2.precedence();
    if (p1 > p2) {
      return 1;
    } else if (p1 == p2) {
      return 0;
    } else {
      return -1;
    }
  };
  _.precedence = function() {
    return -1;
  };
  _.canStack = function(o2) {
    //return true if o2 can stack on this 
    var compPrec = this.comparePrecedence(o2);
    if (!this.rightAssociative) 
      return compPrec > 0;
    else 
      return compPrec >= 0;
  };
});

var FunctionNode = P(OperatorNode, function(_, super_) {
  _.__type__ = "FunctionNode";
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
  _.precedence = function() {
    return 2;
  }
});

var DifferentiationNode = P(FunctionNode, function(_, super_) {
  _.__type__ = "DifferentiationNode";
  _.init = function(boundVar, degree = 1) {
    this.boundVar = boundVar;
    this.degree = degree;
    super_.init.call(this, 'd', 1, [this.boundVar, this.degree], false);
  };
});

var InfixNode = P(OperatorNode, function(_, super_) {
  _.__type__ = "FunctionNode";
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
  _.precedence = function() {
    var precedences = {
      '^' : 4,
      '*' : 3,
      '/' : 3,
      '+' : 1,
      '-' : 1,
      '=' : 0
    };
    return precedences[this.symbol] || -1;
  }
});

var VariableNode = P(SemanticNode, function(_, super_) {
  _.__type__ = "VariableNode";
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
  }
});

var SummationNode = P(ApplicationNode, function(_, super_) {
  _.__type__ = "SummationNode";
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
    currNode = siblingNodes.shift();
    var tokenizedNodes = currNode.toSemanticNodes(siblingNodes);
    semanticNodes = semanticNodes.concat(tokenizedNodes);
  }
  return semanticNodes;
}

function insertMultipliers(semanticNodes) {
  var shouldMultiply = function(node1, node2) {
    return !(node1 instanceof InfixNode ||
            node1 instanceof FunctionNode ||
            node2 instanceof InfixNode);
  };

  if (semanticNodes.length < 2) {
    return;
  }
  for (var i = 1; i < semanticNodes.length; i++) {
    var lhs = semanticNodes[i-1];
    var rhs = semanticNodes[i];
    if (shouldMultiply(lhs, rhs)) {
      semanticNodes.splice(i, 0, InfixNode('*'));
    }
  }
}

//Take a set of tokenized nodes and combine them into an AST.
//Uses the Shunting Yard Algorithm.
function parseTokenizedTree(semanticNodes) {
  var operandStack = [];
  var operatorStack = [];

  var peekBack = function(stack) {
    return stack[stack.length-1];
  };
  var isOperand = function(semanticNode) {
    return !(semanticNode instanceof OperatorNode);
  };
  var addNode = function(operator) {
    //Combine the top two operands and the operator into one node,
    //then push it to the top of the stack.
    var numOperands = operator.numExpectedArgs;
    var args = [];
    if (operandStack.length < numOperands) {
      console.log("Malformed tree. Not enough args for our symbol!");
      return SymbolNode("!");
    }
    for (var i = 0; i < numOperands; i++) {
      args.unshift(operandStack.pop());
    }

    operandStack.push(ApplicationNode(operator, args));
  };

  for (var i = 0; i < semanticNodes.length; i++) {
    currSemanticNode = semanticNodes[i];
    if (isOperand(currSemanticNode)) {
      operandStack.push(currSemanticNode);
    } 
    else {
      //If we're trying to stack a low-precedence operator on top of a 
      //high precedence operator, pop operators until we can fit ours.
      while (operatorStack.length > 0 &&
            !currSemanticNode.canStack(peekBack(operatorStack))) 
      { 
        addNode(operatorStack.pop());
      }
      operatorStack.push(currSemanticNode); 
    }
  }

  while(operatorStack.length > 0) {
    addNode(operatorStack.pop());
  }
    // console.log(operandStack);
    // console.log(operatorStack);
  return operandStack;
}

function gobbleRightTerms(remainingNodes) {
  //TODO: MERGE WITH TOKENIZE AS TOKENIZE "UNTIL"
  //TODO: MAKE WORK WITH SIN
  var shouldStopGobbling = function(node) {
    return (node instanceof PlusMinus) || (node instanceof Equality);
  };

  var gobbled = [];
  while (remainingNodes.length > 0 && !shouldStopGobbling(remainingNodes[0])) {
    currDisplayNode = remainingNodes.shift();
    currSemanticNodes = currDisplayNode.toSemanticNodes(remainingNodes);
    gobbled = gobbled.concat(currSemanticNodes);
  }
  insertMultipliers(gobbled);
  return parseTokenizedTree(gobbled);
}

Node.open(function(_) {
  _.toSemanticNodes = function(remainingNodes) {
    //Tokenize the tree into Semantic Nodes
    var semanticNodes = tokenizeNodes(this.childrenAsArray());
    insertMultipliers(semanticNodes);
    return parseTokenizedTree(semanticNodes);
  };
  _.toSemanticNode = function (remainingNodes) {
    var semanticNodes = this.toSemanticNodes(remainingNodes);
    if (semanticNodes.length != 1) {
      console.log("Not parseable. Too many semantic nodes returned");
      return null;
    } else {
      return semanticNodes[0];
    }
  }
  _.childrenAsArray = function() {
    var children = [];
    for (var currNode = this.ends[L]; currNode; currNode = currNode[R]) {
      children.push(currNode);
    }
    return children;
  };
});

BinaryOperator.open(function(_) {
  _.toSemanticNodes = function () {
    var symbol = '!';
    var rightAssociative = false;
    switch (this.ctrlSeq) {
      case '+':
        symbol = '+';
        break;
      case '-':
        symbol = '-';
        break;
      case '\\div ':
        symbol = '/';
        break;
      case '\\cdot ':
      case '\\times ':
        symbol = '*';
        break;
      case '=':
        symbol = '=';
        break;
    }
    return [InfixNode(symbol)];
  }
});

Superscript.open(function (_) {
  _.toSemanticNodes = function() {
    var operator = InfixNode('^', true, 2);
    var superscript = this.sup.toSemanticNodes();
    return [operator, superscript];
  }
});

Bracket.open(function(_) {
});

//ALSO FUNCTIONS
Variable.open(function(_) {
  _.toSemanticNodes = function (remainingNodes) {
    if (this.isPartOfOperator) {
      var symbol = this.text();
      while(remainingNodes.length > 0 && remainingNodes[0].isPartOfOperator) {
        symbol += remainingNodes.shift().text();
      }
      return [FunctionNode(symbol, 1)];
    } 
    else {
      return [VariableNode(this.ctrlSeq)];
    }
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
      return DifferentiationNode(boundVar.toString(), degree);
    } else {
      var operator = InfixNode('/');
      var args = [this.upInto.toSemanticNode(), this.downInto.toSemanticNode()];
      return ApplicationNode(operator, args);
    }
  };
});

Digit.open(function(_) {
  _.toSemanticNodes = function (remainingNodes) {
    var number = this.ctrlSeq;
    while (remainingNodes[0] && 
            (remainingNodes[0] instanceof Digit || 
            remainingNodes[0].ctrlSeq == '.')) {
      number += remainingNodes.shift().ctrlSeq;
    }
    return [NumberNode(number)];
  };
});

SquareRoot.open(function(_) {
  _.toSemanticNodes = function(_) {
    var symbol = 'sqrt';
    var operator = FunctionNode(symbol, 1);
    var arg = this.blocks[0].toSemanticNodes();
    return ApplicationNode(operator, [arg]); 
  };
});

NthRoot.open(function (_) {
  _.toSemanticNodes = function (_) {
    var symbol = 'nthRoot';
    var operator = FunctionNode(symbol, 2);
    var args = [this.ends[R].toSemanticNodes(), this.ends[L].toSemanticNodes()];
    return ApplicationNode(operator, args);
  }
});

SummationNotation.open(function(_) {
  _.toSemanticNodes = function (remainingNodes) {
    switch (this.ctrlSeq) {
      default:
      case '\\sum':
        return this.sumSemanticNodes(remainingNodes);
        break;
      case '\\prod':
        break;
      case '\\int':
        break;
    };
  };

  _.sumSemanticNodes = function(remainingNodes) {
    //Separate the notation "i=3" into boundVar and from
    var bottom = this.downInto.toSemanticNode();
    if (!(bottom instanceof ApplicationNode)
        || bottom.operator.symbol != '=') {
      console.log('Bottom of the summation is malformed');
      return SymbolNode('!');
    } 
    var to = this.upInto.toSemanticNode();
    var boundVar = bottom.args[0];
    var from = bottom.args[1];

    if (remainingNodes.length > 0) {
      var summand = gobbleRightTerms(remainingNodes);
    }

    return SummationNode(boundVar, from, to, summand);
  };
});