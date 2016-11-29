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
    if (this.args && this.args.length > 0) {
      var output = '(' + this.args[0].toString();  
      for (var i = 1; i < this.args.length; i++) {
        output += this.operator + this.args[i].toString();
      }
      return output + ')';
    } else {
      console.error("No arguments for the operator.", this);
      return '!';
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
  }
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

function comparePrecedences(o1, o2) {
  var precedences = {
    '^' : 3,
    '*' : 2,
    '/' : 2,
    '+' : 1,
    '-' : 1
  }
  var p1 = precedences[o1.symbol];
  var p2 = precedences[o2.symbol];
  if (p1 > p2) {
    return 1;
  } else if (p1 == p2) {
    return 0;
  } else {
    return -1;
  }
}

function canStack(o1, o2) {
  //return true if o1 can stack on o2
  var compPrec = comparePrecedences(o1, o2);
  if (!o1.rightAssociative) 
    return compPrec > 0;
  else 
    return compPrec >= 0;
}

function addNode(operandStack, operator) {
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
}

function isOperand(semanticNode) {
  return !(semanticNode instanceof FunctionNode);
}

function peekBack(stack) {
  return stack[stack.length-1];
}

function childrenAsArray(root) {
  var children = [];
  for (var currNode = root.ends[L]; currNode; currNode = currNode[R]) {
    children.push(currNode);
  }
  return children;
}

function preProcessChildren(node) {
  var children = [];
  var start = this.ends[L];
}

Node.open(function(_) {
  _.toSemanticNodes = function() {

    //Tokenize the tree into Semantic Nodes
    var children = childrenAsArray(this);
    var semanticNodes = [];
    while (children.length > 0) {
      currNode = children.shift();
      var tokenizedNodes = currNode.toSemanticNodes(children);
      semanticNodes = semanticNodes.concat(tokenizedNodes);
    }
    console.log(semanticNodes);

    var operandStack = [];
    var operatorStack = [];

    for (var i = 0; i < semanticNodes.length; i++) {
      currSemanticNode = semanticNodes[i];
      if (isOperand(currSemanticNode)) {
        operandStack.push(currSemanticNode);
      } 
      else {
        //If we're trying to stack a low-precedence operator on top of a 
        //high precedence operator, pop operators until we can fit ours.
        while (operatorStack.length > 0 &&
              !canStack(currSemanticNode, peekBack(operatorStack))) 
        { 
          addNode(operandStack, operatorStack.pop());
        }
        operatorStack.push(currSemanticNode); 
      }
    }

    while(operatorStack.length > 0) {
      addNode(operandStack, operatorStack.pop());
    }

    // console.log(operandStack);
    // console.log(operatorStack);
    return operandStack;
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
    if (remainingNodes[0] instanceof Variable) {
      remainingNodes.unshift(CharCmds['*']());
    }
    return [VariableNode(this.ctrlSeq)];
  }
});


Digit.open(function(_) {
  _.toSemanticNodes = function (remainingNodes) {
    var number = this.ctrlSeq;
    while (remainingNodes[0] instanceof Digit) {
      number += remainingNodes.shift().ctrlSeq;
    }
    if (remainingNodes[0] instanceof Variable) {
      //TODO: INCLUDE FUNCTIONS, PARENS, ETC HERE TOO
      //If a number is next to a variable, insert an implicit multiplication
      remainingNodes.unshift(CharCmds['*']());
    }
    return [Number(number)];
  };
});

// Letter.open(function(_) {
//   _.toSemanticNodes = function (remainingNodes) {
//     var symbol = this.ctrlSeq;
//     if (this.isPartOfOperator) {
//       while(remainingNodes[0].isPartOfOperator) {
//         symbol += remainingNodes.shift().ctrlSeq;
//       }
//     }
//     return [FunctionNode(symbol)];
//   }
// })
