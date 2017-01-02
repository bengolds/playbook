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

  isVariableInScope(name) {
    let isInPinned = this.pinnedVariables.some( (pinned) => {
      return pinned.variable.name === name;
    });
    let isInFree = this.freeVariables.some( (free) => {
      return free.name === name;
    });

    return isInFree || isInPinned;
  }

  indexOfFreeVar(name) {
    return this.freeVariables.findIndex( (free) => {
      return free.name === name;
    });
  }

  indexOfPinnedVar(name) {
    return this.pinnedVariables.findIndex( (pinned) => {
      return pinned.variable.name === name;
    });
  }

  indexOfFunction(name) {
    return this.functions.findIndex( (f) => {
      return f.name === name;
    });
  }

  isPinned(name) {
    return this.indexOfPinnedVar(name) != -1;
  }

  isFree(name) {
    return this.indexOfFreeVar(name) != -1;
  }

}