class LineGraph extends Graph {

  constructor (mathbox, syncedParameters, animated) {
    super(mathbox, syncedParameters, animated);
    this.dataId = 'data';
    this.displayId = 'display';
    this.animId = 'anim';
  }

  static get supportedSignatures() {
    return {
      domains: [
        [SETS.REAL],
      ],
      ranges: [
        [SETS.REAL],
        [SETS.INTEGER],
        [SETS.NATURAL],
      ],
    };
  }

  static get syncedParameterNames() {
    return [
      'xRange',
    ];
  }

  //Setup & Teardown

  setup () {
    let view = this.mathbox.select('cartesian'); 
    let ranges = view.get('range');
    this.setRange('xRange', this.vectorToRange(ranges[0]), false);
    this.setRange('yRange', this.vectorToRange(ranges[1]), false);
    
    view.unbind('range');
    view.bind('range', ()=>{
      return [this.xRange, this.yRange];
    });

    this.data = view.interval({
      channels: 2,
      fps: 60,
      id: this.dataId,
      width: 500
    });
    this.display = view.line({
      width: 5,
      color: '#3090FF',
      zIndex: 2,
      id: this.displayId
    });
    this.dataAnim = this.mathbox.play({
      target: '#' + this.dataId,
      pace: 1,
      id: this.animId
    });
  }

  teardown() {
    this.mathbox.remove('#'+this.dataId);
    this.mathbox.remove('#'+this.displayId);
    this.mathbox.remove('#'+this.animId);
  }

  showFunction(compiledFunction) {
    if (!this.constructor.isSupported(compiledFunction.getSignature())) {
      throw Error('The function signature ' + compiledFunction.getSignature() + 'is unsupported');
    }

    this.compiled = compiledFunction;
    let cachedEval = compiledFunction.eval.bind(compiledFunction);
    let cachedVarName = compiledFunction.freeVariables[0].name;
    let newExpr = (emit, x) => {
      emit(x, cachedEval({
        [cachedVarName]: x
      }));
    };
    this.changeExpr(newExpr);
    this.resetBounds();
  }

  changeExpr(newExpr) {
    if (this.animated && this.data.get('expr')) {
      var currExpr = this.data.get('expr');
      this.dataAnim.set('script', {
        '0.001': {props: {expr: currExpr}},
        '1': {props: {expr: newExpr}},
      });
    }
    else {
      this.data.set('expr', newExpr);
    }
  }

  //Ranges

  resetBounds() {
    var newRange = this.compiled.getMinMax(this.unboundRanges());
    newRange = this.constructor.humanizeBounds(newRange);
    this.setRange('yRange', newRange);
  }

  unboundRanges() {
    let ranges = {};
    let unboundVar = this.compiled.freeVariables[0];
    ranges[unboundVar.name] = this.getFinal('xRange');
    return ranges;
  }

  //Mouse events

  onPan(dx, dy) {
    this.translateRange(dx);
  }

  onPanStop() {
    this.resetBounds();
  }

  onZoom(amount, mouseX, mouseY) {
    let zoomScale = .001;
    let zoomAmount = 1 + zoomScale*amount;
    let t = mouseX/this.width;
    this.zoomRange('xRange', zoomAmount, t);
    this.resetBounds();
  }
}