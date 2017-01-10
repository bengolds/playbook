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

  // getMinMax(unboundRanges, maxSamples = 1e5) {
  //   this._checkRangesMatchVariables(unboundRanges);

  //   if (this.variables.length == 0) {
  //     return [this.eval(), this.eval()];
  //   }

  //   let ranges = Object.assign({}, unboundRanges);
  //   for (let variable of this.variables) {
  //     let pinnedIndex = this.globalScope.indexOfPinnedVar(variable.name);
  //     if (pinnedIndex != -1) {
  //       ranges[variable.name] = this.globalScope.pinnedVariables[pinnedIndex].range;
  //     }
  //   }

  //   let numDimensions = this.variables.length;
  //   let maxSamplesPerDimension = Math.round(Math.pow(maxSamples, 1/numDimensions));

  //   let samples = [];
  //   let scope = {};
  //   let iterate = (dimension) => {
  //     let currVar = this.variables[dimension];
  //     let currBounds = ranges[currVar.name].bounds;
  //     let numSteps = Math.min(ranges[currVar.name].steps, maxSamplesPerDimension);
  //     let boundsWith = currBounds[1]-currBounds[0];
  //     for (let i = 0; i < numSteps; i++) {
  //       let x = currBounds[0] + boundsWith * (i/(numSteps-1));
  //       scope[currVar.name] = x;
  //       if (dimension == numDimensions-1) {
  //         let sample = this.evalWithoutGlobalScope(scope);
  //         if (math.im(sample) == 0 && isFinite(sample)) {
  //           samples.push(sample);
  //         }
  //       } else {
  //         iterate(dimension+1);
  //       }
  //     }
  //   };
  //   iterate(0);


  //   let numCycles = 5;
  //   let mean = math.mean(samples);
  //   for (let i = 0; i < numCycles; i++) {
  //     if (samples.length == 0) {
  //       return [-5, 5];
  //     }
  //     let stddev = math.std(samples);
  //     let numSigmas = 10;
  //     let bottomBracket = mean - stddev * numSigmas;
  //     let topBracket = mean + stddev * numSigmas;

  //     samples = samples.filter( (val) => {
  //       return val > bottomBracket && val < topBracket;
  //     });
  //   }

  //   let bounds = samples.reduce( (range, sample) => {
  //     range[0] = Math.min(range[0], sample);
  //     range[1] = Math.max(range[1], sample);
  //     return range;
  //   }, [Number.MAX_VALUE, -Number.MAX_VALUE]);

  //   return bounds;
  // }

  // _checkRangesMatchVariables(unboundRanges) {
  //   for (let variable of this.variables) {
  //     if (!(variable.name in unboundRanges) &&
  //         !this.globalScope.isPinned(variable.name)) {
  //       throw Error('No range found for ' + variable.name);
  //     }
  //   }
  // }
}