class LineGraph extends Graph {

  constructor (params={}) {
    super(params);

    if (this.probeX === undefined) {
      this.probeX = 0;
    }
    this._exprAnimDuration = 500;
    this._resetBoundsDuration = 250;
    this.scaleLabel = new ScaleLabel(this.overlayDiv, 
      this.getLabelText.bind(this),
      () => {return this.labelsVisible;});
    this.probe = new Probe({
      mathbox: this.mathbox,
      overlayDiv: this.overlayDiv,
      locationCallback: this.getProbePoint.bind(this),
      visibilityCallback: () => {return this.probeVisible;}, 
      styles: {
        topLine: {opacity: 0.5},
        rightLine: {opacity: 0}
      }
    });
    this.setup();
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
    this.autoBoundsCalculator = new AutoBoundsCalculator(this, {
      boundsReceivedCallback: this.newRangeReceived.bind(this)
    });
    let ranges = this.view.get('range');
    this.setRange('xRange', this.vectorToRange(ranges[0]), false);
    this.setRange('yRange', this.vectorToRange(ranges[1]), false);
    
    this.view.bind('range', ()=>{
      return [this.xRange, this.yRange];
    });

    this.data = this.mathboxGroup.interval({
      channels: 2,
      fps: 60,
      width: 500
    });
    this.display = this.mathboxGroup.line({
      width: 5,
      color: '#3090FF',
      zIndex: 3,
    });
    this.dataAnim = this.mathboxGroup.play({
      target: '<<',
      pace: this._exprAnimDuration/1000,
    });

    this.scaleLabel.setup();
    this.probe.setup();
  }

  teardown() {
    super.teardown();
    this.autoBoundsCalculator.teardown();
    this.scaleLabel.teardown();
    this.probe.teardown();
    this.view.unbind('range');
  }

  showFunction(compiledFunction) {
    if (!this.constructor.isSupported(compiledFunction.getSignature())) {
      throw Error('The function signature ' + compiledFunction.getSignature() + 'is unsupported');
    }

    this.changeExpr(this.makeExpr(compiledFunction));
    this.compiled = compiledFunction;
    this.autoBoundsCalculator.getNewBounds();
  }

  pinnedVariablesChanged() {
    this.autoBoundsCalculator.getNewBounds();
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
    this.autoBoundsCalculator.getNewBounds();
  }

  onZoom(amount, mouseX, mouseY) {
    let zoomScale = .001;
    let zoomAmount = 1 + zoomScale*amount;
    let t = mouseX/this.width;
    this.zoomRange('xRange', zoomAmount, t);

    this.autoBoundsCalculator.getNewBounds(50);
  }
}