class RangeBinder {
  constructor(graph) {
    this.view = graph.mathbox.select('cartesian');
    let ranges = this.view.get('range');
    graph.setRange('xRange', ranges[0].toArray(), false);
    graph.setRange('yRange', ranges[1].toArray(), false);
    
    this.view.bind('range', ()=>{
      return [graph.xRange, graph.yRange];
    });
  }

  teardown() {
    this.view.unbind('range');
  }
}