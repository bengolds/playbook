class AutoBoundsCalculator {
  constructor(graph, {
    boundsReceivedCallback = graph.newRangeReceived.bind(graph)
  }) {
    this.graph = graph;
    this.minMaxWorker = new Worker('src/mathObjects/minMaxWorker.js');
    this.minMaxWorker.onmessage = boundsReceivedCallback;
    // this.getMinMax.onerror = (e) => {
    //   console.error(e.detail.message + ' at ' + e.detail.filename + ':' + e.detail.lineno);
    // };
    this._recalcHandler = this.recalculateBoundsReceived.bind(this);
    document.addEventListener('recalculate-bounds', this._recalcHandler);
  }

  teardown() {
    this.minMaxWorker.terminate();
    this.minMaxWorker.postMessage('stop');
    clearTimeout(this.timeout);
    document.removeEventListener('recalculate-bounds', this._recalcHandler);
  }

  getNewBounds(debounceTimeout = 0) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout( () => {
      this.minMaxWorker.postMessage({
        dehydratedFunction: this.graph.compiled.dehydrate(),
        unboundRanges: this.graph.unboundRanges()
      });
    }, debounceTimeout);
  }

  recalculateBoundsReceived(e) {
    if (this._shouldRecalculate(e.detail.variables)) {
      this.getNewBounds(e.detail.debounceTimeout);
    }
  }

  _shouldRecalculate(variables) {
    let compiled = this.graph.compiled;
    if (!compiled) {
      return false;
    }

    return variables.some((varName) => {
      return compiled.variables.some( (variable) => {
        return variable.name === varName;
      });
    });
  }

  static fireRecalcEvent(variables, debounceTimeout = 0) {
    let e = new CustomEvent('recalculate-bounds', {
      detail: {
        variables: variables,
        debounceTimeout: debounceTimeout
      }
    });
    document.dispatchEvent(e);
  }
}