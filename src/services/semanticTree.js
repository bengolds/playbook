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
  }
  _.toString = function () {
    return this.symbol;
  }
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
  }
  _.toString = function() {
    return this.variableName;
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

Node.open(function(_) {
  _.toSemanticNodes = function() {
    var operandStack = [];
    var operatorStack = [];
    var tree = {};


    var currNode = this.ends[L];
    var prevNode = null;

    while(currNode) {
      //Turn our current display node into the set of semantic nodes it represents.
      currSemanticNodes = currNode.toSemanticNodes();
      for (var i = 0; i < currSemanticNodes.length; i++) {
        currSemanticNode = currSemanticNodes[i];
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
      prevNode = currNode;
      currNode = currNode[R];
    }

    while(operatorStack.length > 0) {
      addNode(operandStack, operatorStack.pop());
    }

    console.log(operandStack);
    console.log(operatorStack);
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
  _.toSemanticNodes = function () {
    return [VariableNode(this.ctrlSeq)];
  }
});

Digit.open(function(_) {
  _.toSemanticNodes = function () {
    return [SymbolNode(this.ctrlSeq)];
  }
})