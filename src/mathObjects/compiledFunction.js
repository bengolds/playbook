class CompiledFunction {
  constructor(compiled=null, freeVariables=[], globalScope=new Scope()) {
    this.compiled = compiled;
    this.freeVariables = freeVariables;
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

  getMinMax(unboundRanges, numSamples=200) {
    this._checkRangesMatchFreeVariables();

    if (this.freeVariables.length == 0) {
      return [this.eval(), this.eval()];
    }

    let variables = this.freeVariables;
    let ranges = unboundRanges;

    let iterateSteps = {};
    let numDimensions = variables.length;
    let numSamplePoints = Math.round(Math.pow(numSamples, 1/numDimensions));

    for (let variable of variables) {
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
      let currVar = variables[dimension];
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

  _checkRangesMatchFreeVariables(unboundRanges) {

  }
}