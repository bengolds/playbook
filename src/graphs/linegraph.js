class LineGraph extends Graph {

  constructor (mathbox, syncedParameters, animated, overlayDiv, auxDiv) {
    super(mathbox, syncedParameters, animated, overlayDiv, auxDiv);

    if (this.probeX === undefined) {
      this.probeX = 0;
    }
    this._exprAnimDuration = 500;
    this._resetBoundsDuration = 250;
    this.scaleLabel = new ScaleLabel(overlayDiv, 
      this.getLabelText.bind(this),
      () => {return this.labelsVisible;});
    this.probe = new Probe({
      mathbox: mathbox,
      overlayDiv: overlayDiv,
      locationCallback: this.getProbePoint.bind(this),
      visibilityCallback: () => {return this.probeVisible;}, 
      styles: {
        topLine: {opacity: 0.5},
        rightLine: {opacity: 0}
      }
    });
  }

  static get supportedSignatures() {
    return {
      domains: [
        [],
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
      'labelsVisible',
      'probeVisible',
      'probeX'
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

    this.data = view.interval({
      channels: 2,
      fps: 60,
      id: this.dataId,
      width: 500
    });
    this.display = view.line({
      width: 5,
      color: '#3090FF',
      zIndex: 3,
      id: this.displayId
    });
    this.dataAnim = this.mathbox.play({
      target: '#' + this.dataId,
      pace: this._exprAnimDuration/1000,
      id: this.animId
    });

    this.scaleLabel.setup();
    this.probe.setup();
  }

  teardown() {
    // console.log('tearing down');
    this.getMinMax.terminate();
    //REPLACE THIS WITH ONE GROUP OBJECT
    this.mathbox.remove('#'+this.dataId);
    this.mathbox.remove('#'+this.displayId);
    this.mathbox.remove('#'+this.animId);
    this.scaleLabel.teardown();
    this.probe.teardown();
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
      emit(x, cachedEval({
        [cachedVarName]: x
      }));
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

  getProbePoint() {
    let expr = this.data.get('expr');
    let targetPoint;
    if (expr) {
      expr((x, y)=> {
        targetPoint = [x, y];
      }, this.probeX);
      return targetPoint;
    }
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
    this.probeVisible = true;
  }

  onMouseMove(e) {
    this.mousePoint = [e.offsetX, e.offsetY];
    this.probeX = this.clientToLocalCoords(this.mousePoint)[0];
  }

  onMouseLeave(e) {
    this.labelsVisible = false;
    this.probeVisible = false;
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