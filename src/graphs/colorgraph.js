class ColorGraph extends Graph {

  constructor (mathbox, syncedParameters, animated) {
    super(mathbox, syncedParameters, animated);
    this.dataId = 'data';
    this.displayId = 'display';
    this.animId = 'anim';
    this.flatId = 'flat';
  }

  static get supportedDimensions() {
    return [
      [2, 1], 
    ];
  }

  static get syncedParameterNames() {
    return [
      'xRange',
      'yRange'
    ];
  }

  setup () {
    let dim = 150;
    let view = this.mathbox.select('cartesian'); 
    let ranges = view.get('range');
    this.setRange('xRange', this.vectorToRange(ranges[0]), false);
    this.setRange('yRange', this.vectorToRange(ranges[1]), false);

    view.unbind('range');
    view.bind('range', ()=>{
      return [this.xRange, this.yRange];
    });

    this.flat = view.area({
      channels: 3,
      id: 'flat',
      width: dim,
      height: dim,
      expr: (emit, x, y) => {
        emit(x, y, 0);
      }
    });
    this.data = view.area({
      channels: 4,
      id: this.dataId,
      width: dim,
      height: dim
    });
    this.display = view.surface({
      colors: '#' + this.dataId,
      points: '#' + this.flatId,
      id: this.displayId
    });
    this.dataAnim = this.mathbox.play({
      target: '#' + this.dataId,
      pace: 1,
      id: this.animId
    });

    this.setRange('xRange', [-5, 5]);
    this.setRange('yRange', [-5, 5]);
  }

  teardown() {
    this.mathbox.remove('#'+this.dataId);
    this.mathbox.remove('#'+this.displayId);
    this.mathbox.remove('#'+this.animId);
    this.mathbox.remove('#'+this.flatId);
  }

  showFunction(functor) {
    this.functor = functor;
    let cachedEval = this.functor.eval.bind(this.functor);
    let newExpr = (emit, x, y) => {
      let val = cachedEval(x, y);
      emit (...this.colorMap(val), 255);
    };
    this.data.set('expr', newExpr);
    this.resetBounds();
  }

  colorMap(val) {
    if (typeof val != 'number') {
      return [0,0,0];
    }
    let t = (val-this.colorRange[0])/(this.colorRange[1]-this.colorRange[0]);
    let i = Math.round(t*warmCoolMap.length);
    i = Math.min(Math.max(0, i), warmCoolMap.length-1);
    return warmCoolMap[i];
  }

  //Ranges

  resetBounds() {
    var minMax = this.functor.getMinMax(this.unboundRanges());
    minMax = this.constructor.humanizeBounds(minMax);
    let largestDisplacement = Math.max(Math.abs(minMax[0]), Math.abs(minMax[1]));
    let newRange = [-largestDisplacement, largestDisplacement];
    this.setRange('colorRange', newRange);
  }

  unboundRanges() {
    return [this.getFinal('xRange'), this.getFinal('yRange')];
  }

  // Mouse events
  onPan(dx, dy) {
    this.translateRange(dx, dy);
  }

  onPanStop() {
    this.resetBounds();
  }

  onZoom(amount, mouseX, mouseY) {
    let zoomScale = .001;
    let zoomAmount = 1 + zoomScale*amount;
    let tX = mouseX/this.width;
    let tY = mouseY/this.height;
    this.zoomRange('xRange', zoomAmount, tX);
    this.zoomRange('yRange', zoomAmount, tY);
    this.resetBounds();
  }
}