class LineGraph extends Graph {

  constructor (params={}) {
    super(params);

    this.setupMathbox();

    this.rangeBinder = new RangeBinder(this);
    this.scaleLabel = new ScaleLabel(this, {
      visibleCallback: () => {return this.labelsVisible;},
      rangeBinder: this.rangeBinder
    });

    if (this.probeX === undefined) {
      this.probeX = 0;
    }
    this.probe = new Probe(this, {
      visibilityCallback: () => {return this.probeVisible;}, 
      styles: {
        topLine: {opacity: 0.5},
        rightLine: {opacity: 0}
      },
      labelMargin: 4
    });

    this.autoBoundsCalculator = new AutoBoundsCalculator(this, {});
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

  setupMathbox () {
    this._exprAnimDuration = 500;

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
  }

  teardown() {
    super.teardown();
    this.autoBoundsCalculator.teardown();
    this.scaleLabel.teardown();
    this.probe.teardown();
    this.rangeBinder.teardown();
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
    //THIS IS USED WHEN GOING FROM 0 -> 1 DIMS
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
    AutoBoundsCalculator.fireRecalcEvent([this.compiled.freeVariables[0].name]);
  }

  onZoom(amount, mouseX, mouseY) {
    let zoomScale = .001;
    let zoomAmount = 1 + zoomScale*amount;
    let t = mouseX/this.width;
    this.zoomRange('xRange', zoomAmount, t);

    AutoBoundsCalculator.fireRecalcEvent([this.compiled.freeVariables[0].name], 50);
  }
}