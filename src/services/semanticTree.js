Controller.open(function(_) {
  _.exportSemanticTree = function() {
    var semanticTree = this.root.toSemanticTree();
    return semanticTree.toString();
  };
  _.logSemanticTree = function() {
    console.log(this.root.toSemanticTree());
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

var FunctionNode = P(SemanticNode, function(_, super_) {
	_.__type__ = "FunctionNode";
  _.init = function (operator, args) {
    this.operator = operator;
    this.args = args;
    super_.init.call(this);
  };
  _.toString = function () {
    var ret = '(' + this.args[0].toString() + this.operator.toString() + this.args[1].toString() + ')';
    return ret;
  }
});

var SymbolNode = P(SemanticNode, function(_, super_) {
  _.__type__ = "SymbolNode";
  _.init = function (symbol, rightAssociative) {
    this.symbol = symbol;
    this.rightAssociative = rightAssociative;
    super_.init.call(this);
  }
  _.toString = function () {
    return this.symbol;
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


Fraction.open(function(_) {
  _.toSemanticTree = function() {
    return "hello";
  };
});



function comparePrecedences(o1, o2) {
  var precedences = {
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
  var rNode = operandStack.pop(), lNode = operandStack.pop();
  var args = [lNode, rNode];
  operandStack.push(FunctionNode(operator, args));
}

function isOperand(semanticNode) {
  return !(semanticNode instanceof SymbolNode);
}

function peekBack(stack) {
  return stack[stack.length-1];
}

Node.open(function(_) {
  _.toSemanticTree = function() {
    var operandStack = [];
    var operatorStack = [];
    var tree = {};


    var currNode = this.ends[L];
    var prevNode = null;

    while(currNode) {
      currSemanticNode = currNode.toSemanticTree();
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
      prevNode = currNode;
      currNode = currNode[R];
    }

    while(operatorStack.length > 0) {
      addNode(operandStack, operatorStack.pop());
    }

    console.log(operandStack);
    console.log(operatorStack);
    return operandStack[0];
  };
});

BinaryOperator.open(function(_) {
  _.toSemanticTree = function () {
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
    return SymbolNode(symbol, rightAssociative);
  }
});

Variable.open(function(_) {
  _.toSemanticTree = function () {
    return VariableNode(this.ctrlSeq);
  }
});