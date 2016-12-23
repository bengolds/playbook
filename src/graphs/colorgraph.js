class ColorGraph extends Graph {

  constructor (mathbox, syncedParameters, animated) {
    super(mathbox, syncCallback);
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
    let dim = 100;
    let view = this.mathbox.select('cartesian');
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
    // TODO: Fix this
    // var duration = this.dataAnim.get('pace')*1000;
    // this._animateRange('xRange', [-5, 5], duration, 'easeInOutSine');
    // this._animateRange('yRange', [-5, 5], duration, 'easeInOutSine');
  }

  teardown() {
    this.mathbox.remove('#'+this.dataId);
    this.mathbox.remove('#'+this.displayId);
    this.mathbox.remove('#'+this.animId);
    this.mathbox.remove('#'+this.flatId);
  }

  showFunction(functor) {
    let cachedEval = this.functor.eval.bind(this.functor);
    let newExpr = (emit, x, y) => {
      let val = cachedEval(x, y);
      emit (...this.colorMap(val), 255);
    };
    // this._resetMinMax(this.animated);
    // this._changeExpr(newExpr, this.animated);  
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
}