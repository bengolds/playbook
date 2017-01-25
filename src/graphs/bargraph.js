class BarGraph extends Graph {

  constructor (mathbox, syncedParameters, animated) {
    super(mathbox, syncedParameters, animated);

    this._exprAnimDuration = 500;
    this._resetBoundsDuration = 250;
    this.labelsVisible = false;
  }

  static get supportedSignatures() {
    return {
      domains: [
        [SETS.INTEGER],
        [SETS.NATURAL],
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
    this.getMinMax = new Worker('src/mathObjects/getMinMax.js');
    this.getMinMax.onmessage = this.newRangeReceived.bind(this);
    // this.getMinMax.onerror = (e) => {
    //   console.error(e.detail.message + ' at ' + e.detail.filename + ':' + e.detail.lineno);
    // };
    let view = this.mathbox.select('cartesian'); 
    let ranges = view.get('range');
    this.setRange('xRange', this.vectorToRange(ranges[0]), false);
    this.setRange('yRange', this.vectorToRange(ranges[1]), false);
    
    view.unbind('range');
    view.bind('range', ()=>{
      return [this.xRange, this.yRange];
    });

    this.dataId = 'data';
    this.displayId = 'display';
    this.animId = 'anim';

    this.data = view.array({
      channels: 2,
      fps: 60,
      id: this.dataId,
      width: 10
    });
    // this.display = view.line({
    //   width: 5,
    //   color: '#3090FF',
    //   zIndex: 2,
    //   id: this.displayId
    // });
    this.display = view.vector({
      end: true,
      width: 5,
      color: '#3090FF',
      zIndex: 2,
      id: this.displayId
    });
    this.dataAnim = this.mathbox.play({
      target: '#' + this.dataId,
      pace: this._exprAnimDuration/1000,
      id: this.animId
    });
  }

  teardown() {
    // console.log('tearing down');
    this.getMinMax.terminate();
    this.mathbox.remove('#'+this.dataId);
    this.mathbox.remove('#'+this.displayId);
    this.mathbox.remove('#'+this.animId);
  }

  showFunction(compiledFunction) {
    if (!this.constructor.isSupported(compiledFunction.getSignature())) {
      throw Error('The function signature ' + compiledFunction.getSignature() + 'is unsupported');
    }

    this.changeExpr(this.makeExpr(compiledFunction));
    this.compiled = compiledFunction;
    this.resetBounds(this._exprAnimDuration, 'easeInOutSine');
  }

  pinnedVariablesChanged() {
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

  makeExpr(compiledFunction) {
    let cachedEval = compiledFunction.eval.bind(compiledFunction);
    let freeVars = compiledFunction.freeVariables;
    let cachedVarName = '_';
    if (freeVars.length == 1) {
      cachedVarName = freeVars[0].name;
    }
    let newExpr = (emit, x) => {
      emit(x, 0);
      emit(x, cachedEval({
        [cachedVarName]: x
      }));
    };
    return newExpr;
  }

  //Ranges

  resetBounds(animDuration=this._resetBoundsDuration, animEasing='easeOutSine') {
    this.getMinMax.postMessage({
      dehydratedFunction: this.compiled.dehydrate(),
      unboundRanges: this.unboundRanges()
    });
  }

  newRangeReceived(e) {
    let newRange = this.constructor.humanizeBounds(e.data);
    if (this.animated) {
      this.animateRange('yRange', newRange);
      // this.animateRange('yRange', newRange, animDuration, animEasing);
    } 
    else {
      this.setRange('yRange', newRange);
    }
  }

  unboundRanges() {
    let ranges = {};
    let unboundVar = this.compiled.freeVariables[0];
    if (unboundVar) {
      ranges[unboundVar.name] = {
        bounds: this.getFinal('xRange'),
        steps: 200
      };
    } 
    return ranges;
  }

  //Mouse events

  onMouseEnter(e) {
    this.labelsVisible = true;
  }

  onMouseLeave(e) {
    this.labelsVisible = false;
  }

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

    clearTimeout(this.resetBoundsTimeout);
    this.resetBoundsTimeout = setTimeout( () => {
      this.resetBounds();
    }, 50);
  }
}