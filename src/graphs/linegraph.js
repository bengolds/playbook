class LineGraph extends Graph {

  constructor (mathbox, syncedParameters, animated) {
    super(mathbox, syncedParameters, animated);
    this.dataId = 'data';
    this.displayId = 'display';
    this.animId = 'anim';
  }

  static get supportedDimensions() {
    return [
      [0, 1], 
      [1, 1]
    ];
  }

  static get syncedParameterNames() {
    return [
      'xRange',
    ];
  }

  //Setup & Teardown

  setup () {
    let view = this.mathbox.select('cartesian'); 
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

    // let duration = this.dataAnim.get('pace')*1000;
    // this.animateRange('xRange', [-5, 5], duration, 'easeInOutSine');
  }

  teardown() {
    this.mathbox.remove('#'+this.dataId);
    this.mathbox.remove('#'+this.displayId);
    this.mathbox.remove('#'+this.animId);
  }

  showFunction(functor) {
    this.functor = functor;
    let cachedEval = functor.eval.bind(functor);
    let newExpr = (emit, x) => {
      emit(x, cachedEval(x));
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
    var newRange = this.functor.getMinMax(this.unboundRanges());
    newRange = this.constructor.humanizeBounds(newRange);
    this.setRange('yRange', newRange);
  }

  unboundRanges() {
    return [this.getFinal('xRange')];
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