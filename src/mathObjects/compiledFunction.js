class CompiledFunction {
  constructor(compiled=null, variables=[], globalScope=new Scope()) {
    this.compiled = compiled;
    this.variables = variables;
    this.globalScope = globalScope;
  }

  eval(scope) {
    let combinedScope = Object.assign({}, this.globalScope.getForMathJS(), scope);
    return this.compiled.eval(combinedScope);
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

  getMinMax(unboundRanges, numSamples=200) {
    this._checkRangesMatchVariables(unboundRanges);

    if (this.variables.length == 0) {
      return [this.eval(), this.eval()];
    }

    let ranges = Object.assign({}, unboundRanges);
    for (let variable of this.variables) {
      let pinnedIndex = this.globalScope.indexOfPinnedVar(variable.name);
      if (pinnedIndex != -1) {
        ranges[variable.name] = this.globalScope.pinnedVariables[pinnedIndex].bounds;
      }
    }

    let iterateSteps = {};
    let numDimensions = this.variables.length;
    let numSamplePoints = Math.round(Math.pow(numSamples, 1/numDimensions));

    for (let variable of this.variables) {
      let currRange = ranges[variable.name];
      let rangeWidth = currRange[1]-currRange[0];
      iterateSteps[variable.name] = rangeWidth/numSamplePoints;
    }

    let minY = Number.MAX_VALUE, maxY = -minY;
    let checkValue = function (y) {
      if (!isNaN(y)) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    };

    let scope = {};
    let iterate = (dimension) => {
      let currVar = this.variables[dimension];
      let currRange = ranges[currVar.name];
      let currStep = iterateSteps[currVar.name];
      for (let x = currRange[0]; x < currRange[1]; x+=currStep) {
        scope[currVar.name] = x;
        if (dimension == numDimensions-1) {
          checkValue(this.eval(scope));
        } else {
          iterate(dimension+1);
        }
      }
    };
    iterate(0);
    return [minY, maxY];
  }

  _checkRangesMatchVariables(unboundRanges) {
    for (let variable of this.variables) {
      if (!(variable.name in unboundRanges) &&
          !this.globalScope.isPinned(variable.name)) {
        throw Error('No range found for ' + variable.name);
      }
    }
  }
}