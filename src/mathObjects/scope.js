class Scope {
  constructor(freeVariables = [], pinnedVariables = [], functions = []) {
    this.freeVariables = freeVariables;
    this.pinnedVariables = pinnedVariables;
    this.functions = functions;
  }

  getForMathJS() {
    let ret = {};
    for (let pinned of this.pinnedVariables) {
      ret[pinned.variable.name] = pinned.value; 
    }
    return ret;
  }
}