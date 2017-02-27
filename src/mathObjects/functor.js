class Functor {
  constructor(name, scope, definition) {
    this.name = name;
    this.scope = scope;
    this.definition = definition;
  } 

  get definition() {
    return this._definition;
  }
  set definition(val) {
    this._definition = val;
    this._compile();
    //TODO: LOAD DEFINITION INTO SCOPE UNLESS THAT'S TOO UNWATCHABLE
  }

  eval(localScope) {
    let combinedScope = Object.assign({}, localScope, this.scope.getForMathJS());
    return this._compiled.eval(combinedScope);
  }

  _compile() {
    let getVariableNames = function(definition) {
      let names = [];
      let parsedFunction = math.parse(definition);
      parsedFunction.traverse( (node) => {
        if (node.type == 'SymbolNode' && !names.includes(node.name)) {
          names.push(node.name);
        }
      });

      // let variables = symbols.map( (symbol) => {
      //   if (scope.hasVariable(symbol)) {
      //     return scope.getVariable(symbol);
      //   }
      //   else {
      //     return new Variable(symbol);
      //   }
      // });

      return names; 
    };

    // if (!skipPreprocessing) {
    let definition = this._definition;
    if (!definition || definition == '') {
      definition = '0';
    }
    definition = Algebrite.simplify(definition).toString();
    // definition = this._insertMultipliers(definition, this.scope);
    // }

    let variableNames = getVariableNames(definition);
    let functionSignature = this.name + '(' + variableNames.join(',') + ')';
    console.log(functionSignature);
    //TODO: I don't love this _loadedFunctions bit
    math.eval(functionSignature + '=' + definition, this.scope._loadedFunctions);

    //TODO: then this part just becomes loading math.compile('f(x)')
    this._compiled = math.compile(functionSignature);
  }

}