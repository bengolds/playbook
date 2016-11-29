Controller.open(function(_) {
  _.exportSemanticTree = function() {
    return this.root.toSemanticTree();
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
});

var SymbolNode = P(SemanticNode, function(_, super_) {
  _.__type__ = "SymbolNode";
  _.init = function (symbol) {
    this.symbol = symbol;
    super_.init.call(this);
  }
});

var VariableNode = P(SemanticNode, function(_, super_) {
  _.__type__ = "VariableNode";
  _.init = function (variableName, variableType) {
    this.variableName = variableName;
    this.variableType = variableType || SETS.REAL;
    super_.init.call(this);
  }
});


Fraction.open(function(_) {
  _.toSemanticTree = function() {
    return "hello";
  };
});

Node.open(function(_) {
  _.toSemanticTree = function() {
    var output = "";
    return this.foldChildren(output, function(text, child) {
      return text + child.toSemanticTree();
    });
  };
});
