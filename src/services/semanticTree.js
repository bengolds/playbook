Controller.open(function(_) {
  _.exportSemanticTree = function() {
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
  }
  _.preprocess = function (rightNode) {
    return null;
  }
});

var ApplicationNode = P(SemanticNode, function(_, super_) {
	_.__type__ = "ApplicationNode";
  _.init = function (operator, args) {
    this.operator = operator;
    this.args = args;
    super_.init.call(this);
  };
  _.toString = function () {
    switch (this.operator.expectedArgs) {
      case 0:
        return this.operator.symbol;
      case 1:
        return this.operator.symbol + '(' + this.args[0] + ')';
      default:
        var output = '(' + this.args[0].toString();  
        for (var i = 1; i < this.args.length; i++) {
          output += this.operator + this.args[i].toString();
        }
        return output + ')';
    }
  }
});

var SymbolNode = P(SemanticNode, function(_, super_) {
  _.__type__ = "SymbolNode";
  _.init = function (symbol) {
    this.symbol = symbol;
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
});

var FunctionNode = P(SymbolNode, function(_, super_) {
  _.__type__ = "FunctionNode";
  _.init = function (symbol, rightAssociative, expectedArgs) {
    this.rightAssociative = rightAssociative || false;
    this.expectedArgs = expectedArgs || 2;
    super_.init.call(this, symbol);
  };
  _.comparePrecedence = function(o2) {
    var precedences = {
      '^' : 3,
      '*' : 2,
      '/' : 2,
      '+' : 1,
      '-' : 1
    }
    var p1 = precedences[this.symbol];
    var p2 = precedences[o2.symbol];
    if (p1 > p2) {
      return 1;
    } else if (p1 == p2) {
      return 0;
    } else {
      return -1;
    }
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

var VariableNode = P(SemanticNode, function(_, super_) {
  _.__type__ = "VariableNode";
  _.init = function (variableName, variableType) {
    this.variableName = variableName;
    this.variableType = variableType || SETS.REAL;
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

function tokenizeNodes(siblingNodes) {
  var isOneOf = function(object, types) {
    if (!types)
      return false;
    for (var i = 0; i < types.length; i++) {
      if (object instanceof types[i])
        return true;
    }
    return false;
  }
  //Takes display tree siblings and turns them into tokenized semantic nodes
  var semanticNodes = [];
  while (siblingNodes.length > 0) {
    currNode = siblingNodes.shift();
    var tokenizedNodes = currNode.toSemanticNodes(siblingNodes);
    //If you're directly adjacent to something you multiply with, insert a mult.
    semanticNodes = semanticNodes.concat(tokenizedNodes);
    if (isOneOf(siblingNodes[0], currNode.multiplyWith)) {
      semanticNodes.push(FunctionNode('*'));
    }
  }
  return semanticNodes;
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
    return !(semanticNode instanceof FunctionNode);
  };
  var addNode = function(operator) {
    //Combine the top two operands and the operator into one node,
    //then push it to the top of the stack.
    var numOperands = operator.expectedArgs;
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

Node.open(function(_) {
  _.toSemanticNodes = function() {
    //Tokenize the tree into Semantic Nodes
    var semanticNodes = tokenizeNodes(this.childrenAsArray());
    return parseTokenizedTree(semanticNodes);
  };
  _.childrenAsArray = function() {
    var children = [];
    for (var currNode = this.ends[L]; currNode; currNode = currNode[R]) {
      children.push(currNode);
    }
    return children;
  }
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
    }
    return [FunctionNode(symbol, rightAssociative, 2)];
  }
});

Superscript.open(function (_) {
  _.toSemanticNodes = function() {
    var nodes = [FunctionNode('^', true, 2)];
    nodes = nodes.concat(this.sup.toSemanticNodes());
    return nodes;
  }
});

Variable.open(function(_) {
  _.toSemanticNodes = function (remainingNodes) {
    if (this.isPartOfOperator) {
      var symbol = this.text();
      while(remainingNodes.length > 0 && remainingNodes[0].isPartOfOperator) {
        symbol += remainingNodes.shift().text();
      }
      return [FunctionNode(symbol, true, 1)];
    } 
    else {
      return [VariableNode(this.ctrlSeq)];
    }
  };
  _.multiplyWith = [Fraction, Variable, Digit];
});

Fraction.open(function (_) {
  _.toSemanticNodes = function(remainingNodes) {

    var operator = FunctionNode('/');
    var args = [this.upInto.toSemanticNodes(), this.downInto.toSemanticNodes()];
    return ApplicationNode(operator, args);
  };
  _.multiplyWith = [Fraction, Variable, Digit];
});

Digit.open(function(_) {
  _.toSemanticNodes = function (remainingNodes) {
    var number = this.ctrlSeq;
    while (remainingNodes[0] instanceof Digit) {
      number += remainingNodes.shift().ctrlSeq;
    }
    return [NumberNode(number)];
  };
  _.multiplyWith = [Fraction, Variable];
});
