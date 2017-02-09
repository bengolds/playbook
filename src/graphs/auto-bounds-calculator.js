class AutoBoundsCalculator {
  constructor(graph, {
    boundsReceivedCallback = graph.newRangeReceived.bind(graph)
  }) {
    this.graph = graph;
    this.minMaxWorker = new Worker('/src/mathObjects/minMaxWorker.js');
    this.minMaxWorker.onmessage = boundsReceivedCallback;
    // this.getMinMax.onerror = (e) => {
    //   console.error(e.detail.message + ' at ' + e.detail.filename + ':' + e.detail.lineno);
    // };
  }

  teardown() {
    this.minMaxWorker.terminate();
    this.minMaxWorker.postMessage('stop');
    clearTimeout(this.timeout);
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
}