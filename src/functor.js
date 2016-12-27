class Functor {
  constructor() {
    this.name = '';
    this.definition = '';
    this.latex = '';
    this.compiled = ()=>{return 0;};
  }

  get symbols() {
    return [];
  }

  getMinMax(pinnedVariables, numSamples=200) {
    return [-5, 5];
  }
}