class Functor {
  constructor(name, scope=new Scope(), definition) {
    this.name = name;
    this.scope = scope;
    this.definition = definition;
    this.latex = definition;
  } 

  get definition() {
    return this._definition;
  }
  set definition(val) {
    this._definition = val;
    this._compile();
    //TODO: LOAD DEFINITION INTO SCOPE UNLESS THAT'S TOO UNWATCHABLE
  }

  get domain() {
    return this.freeVariables.map((variable) => {
      return variable.set;
    });
  }

  get range() {
    return [SETS.REAL];
  }

  get signature() {
    return {
      domain: this.domain,
      range: this.range
    };
  }

  get freeVariables() {
    return this.variables.filter( (variable) => {
      return !this.scope.isPinned(variable.name);
    }).sort(Variable.compare);
  }

  eval(localScope) {
    let combinedScope = Object.assign({}, localScope, this.scope.getForMathJS());
    return this._compiled.eval(combinedScope);
  }

  dehydrate() {

  }

  static rehydrate(dehydrated) {

  }

  _compile() {
    let getVariableNames = (definition) => {
      let names = [];
      let parsedFunction = math.parse(definition);
      parsedFunction.traverse( (node) => {
        if (node.type == 'SymbolNode' && !names.includes(node.name)
          && !this.scope.isFunction(node.name)) {
          names.push(node.name);
        }
      });
      return names; 
    };

    let variablesFromNames = (names) => {
      return names.map( (symbol) => {
        if (this.scope.hasVariable(symbol)) {
          return this.scope.getVariable(symbol);
        }
        else {
          let variable = new Variable(symbol);
          this.scope.variables.push(variable);
          return variable;
        }
      });
    };

    // if (!skipPreprocessing) {
    let definition = this._definition;
    if (!definition || definition == '') {
      definition = '0';
    }
    // definition = Algebrite.simplify(definition).toString();
    // definition = Functor._insertMultipliers(definition, this.scope);
    // }

    let variableNames = getVariableNames(definition);
    let functionSignature = this.name + '(' + variableNames.join(',') + ')';
    //TODO: I don't love this _loadedFunctions bit
    //TODO: THIS BECOMES FULL SUBSTITUTION WITH DEPENDENCY GRAPHS
    math.eval(functionSignature + '=' + definition, this.scope._loadedFunctions);

    this._compiled = math.compile(functionSignature);
    this.variables = variablesFromNames(variableNames);
  }

  static _insertMultipliers(funcString, scope) {
    let re = /([a-z]+)\s*\(/g;
    return funcString.replace(re, (match, symbol) => {
      if (symbol.length > 1 || scope.isFunction(symbol)){
        return match;
      } else {
        return symbol+'*(';
      }
    });
  }
}