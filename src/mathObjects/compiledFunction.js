class CompiledFunction {
  constructor(compiled=null, definition=null, variables=[], globalScope=new Scope()) {
    this.compiled = compiled;
    this.definition = definition;
    this.variables = variables;
    this.globalScope = globalScope;
  }

  eval(scope) {
    let combinedScope = Object.assign({}, scope, this.globalScope.getForMathJS());
    return this.compiled.eval(combinedScope);
  }

  evalWithoutGlobalScope(scope) {
    return this.compiled.eval(scope);
  }

  getDomain() {
    return this.freeVariables.map((variable) => {
      return variable.set;
    });
  }

  getRange() {
    return [SETS.REAL];
  }

  getSignature() {
    return {
      domain: this.getDomain(),
      range: this.getRange(),
    };
  }

  get freeVariables() {
    return this.variables.filter( (variable) => {
      return !this.globalScope.isPinned(variable.name);
    });
  }

  dehydrate() {
    return {
      definition: this.definition,
      scope: this.globalScope
    };
  }

  static rehydrate(dehydrated) {
    dehydrated.scope.__proto__ = Scope.prototype;
    return this.compile(dehydrated.definition, dehydrated.scope, true);
  }

  static compile(definition, scope, skipPreprocessing=false) {
    if (!skipPreprocessing) {
      if (!definition || definition == '') {
        definition = '0';
      }
      definition = Algebrite.simplify(definition).toString();
      definition = this._insertMultipliers(definition, scope);
    }
    let parsed = math.parse(definition);
    let symbols = this._getVariables(parsed, scope);

    return new this(parsed.compile(), definition, symbols, scope);
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

  static _getVariables(parsedFunction, scope) {
    var symbols = [];
    parsedFunction.traverse( (node) => {
      if (node.type == 'SymbolNode' && !symbols.includes(node.name)) {
        symbols.push(node.name);
      }
    });

    let variables = symbols.map( (symbol) => {
      if (scope.hasVariable(symbol)) {
        return scope.getVariable(symbol);
      }
      else {
        return new Variable(symbol);
      }
    });

    return variables; 
  }

}