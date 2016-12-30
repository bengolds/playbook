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
    return [SETS.REAL];
  }

  getRange() {
    return [SETS.REAL];
  }
}