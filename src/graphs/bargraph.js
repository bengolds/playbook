class BarGraph extends Graph {

  constructor (mathbox, syncedParameters, animated, overlayDiv, auxDiv) {
    super(mathbox, syncedParameters, animated, overlayDiv, auxDiv);

    this._exprAnimDuration = 500;
    this._resetBoundsDuration = 250;
    this.scaleLabel = new ScaleLabel(overlayDiv, 
      this.getLabelText.bind(this),
      () => {return this.labelsVisible;});
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
      'labelsVisible'
    ];
  }

  isNatural() {
    return this.compiled.getDomain()[0] == SETS.NATURAL;
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
      items: 4,
      fps: 60,
      id: this.dataId,
    }, {
      width: () => {
        return Math.ceil(this.xRange[1])-Math.floor(this.xRange[0]) + 1;
      }
    });
    this.display = view.face({
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

    if (this.xRange[1]-this.xRange[0] < 10) {
      let center = this.xRange[0] + (this.xRange[1]-this.xRange[0])/2;
      let newXRange = [center-5, center+5];
      this.setRange('xRange', newXRange);
    }

    this.scaleLabel.setup();
  }

  teardown() {
    // console.log('tearing down');
    this.getMinMax.terminate();
    this.mathbox.remove('#'+this.dataId);
    this.mathbox.remove('#'+this.displayId);
    this.mathbox.remove('#'+this.animId);
    this.scaleLabel.teardown();
  }

  showFunction(compiledFunction) {
    if (!this.constructor.isSupported(compiledFunction.getSignature())) {
      throw Error('The function signature ' + compiledFunction.getSignature() + 'is unsupported');
    }

    this.changeExpr(this.makeExpr(compiledFunction));
    this.compiled = compiledFunction;

    if (this.isNatural()) {
      this.clampBounds(true);
    }
    
    this.resetBounds(this._exprAnimDuration, 'easeInOutSine');
    this.mathbox.inspect();
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
    let newExpr = (emit, i) => {
      let x = Math.floor(this.xRange[0]) + i;
      if (this.isNatural() && x < 0) {
        return;
      }
      let y = cachedEval({[cachedVarName]: x });
      emit(x-0.4, 0);
      emit(x-0.4, y);
      emit(x+0.4, y);
      emit(x+0.4, 0);
    };
    return newExpr;
  }
  
  getLabelText() {
    let numDigits = 1;
    let xAxisLabel = '';
    if (this.compiled && this.compiled.freeVariables.length > 0) {
      xAxisLabel = this.compiled.freeVariables[0].name;
    }
    return {
      xMinLabel: this.xRange[0].toFixed(numDigits),
      xMaxLabel: this.xRange[1].toFixed(numDigits),
      yMinLabel: this.yRange[0].toFixed(numDigits),
      yMaxLabel: this.yRange[1].toFixed(numDigits),
      xAxisLabel: xAxisLabel,
    };
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

  clampBounds(animated) {
    let xRange = this.getFinal('xRange');
    if (xRange[0] < 0) {
      this.setRange('xRange', [0, xRange[1]-xRange[0]], animated);
    }
  }

  onMouseEnter(e) {
    this.labelsVisible = true;
  }

  onMouseLeave(e) {
    this.labelsVisible = false;
  }

  onPan(dx, dy) {
    this.translateRange(dx);
    if (this.isNatural()) {
      this.clampBounds(false);
    }
  }

  onPanStop() {
    this.resetBounds();
  }

  onZoom(amount, mouseX, mouseY) {
    let zoomScale = .001;
    let zoomAmount = 1 + zoomScale*amount;
    let t = mouseX/this.width;
    this.zoomRange('xRange', zoomAmount, t);
    if (this.isNatural()) {
      this.clampBounds(true);
    }

    clearTimeout(this.resetBoundsTimeout);
    this.resetBoundsTimeout = setTimeout( () => {
      this.resetBounds();
    }, 50);
  }
}