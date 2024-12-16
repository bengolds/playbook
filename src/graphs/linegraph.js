class LineGraph extends Graph {

  constructor (params={}) {
    super(params);

    this.setupMathbox();

    this.rangeBinder = new RangeBinder(this);
    this.scaleLabel = new ScaleLabel(this, {
      visibleCallback: () => {return this.isMouseOver;},
      rangeBinder: this.rangeBinder
    });

    if (this.probeX === undefined) {
      this.probeX = 0;
    }
    this.probe = new Probe(this, {
      visibleCallback: () => {return this.isMouseOver;}, 
      styles: {
        topLine: {opacity: 0.5},
        rightLine: {opacity: 0}
      },
      labelMargin: 4
    });

    this.autoBoundsCalculator = new AutoBoundsCalculator(this, {});

    this.autoButton = new GraphButton(this, {
      css: `transform: translate(-100%, -50%);
            left: -4px;
            top: 50%; `,
      toggles: true,
      text: 'auto',
      onTap: () => {
        if (this.autoButton.active) {
          AutoBoundsCalculator.fireRecalcEvent([this.compiled.freeVariables[0].name]);
        }
      },
      visibleCallback: () => {return this.isMouseOver;}
    });
    this.autoButton.active = true;
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
      'isMouseOver',
      'probeX',
      'selectedLineGraph'
    ];
  }

  setupMathbox () {
    this._exprAnimDuration = 500;

    //Set up primary graph
    this.data = this.mathboxGroup.interval({
      channels: 2,
      fps: 60,
      width: 500
    });
    this.mathboxGroup.line({
      width: 5,
      color: this.primaryColor.getStyle(),
      zIndex: 3,
    });
    this.dataAnim = this.mathboxGroup.play({
      target: '<<',
      pace: this._exprAnimDuration/1000,
    });

    //Set up secondary graph
    let shouldShowSecondary = () => {
      return (this.selectedLineGraph && this.selectedLineGraph != this);
    };
    this.secondaryLine = this.mathboxGroup.interval({
      channels: 2,
      width: 500,
    }, {
      expr: () => { 
        if (shouldShowSecondary()) {
          return this.selectedLineGraph.data.get('expr');
        } else {
          return (emit, x) => {emit(x, 0);};
        }
      },
    })
    .line({
      width: 5,
      zIndex: 3,
    }, {
      opacity: () => { return shouldShowSecondary() ? 0.5 : 0; },
      color: () => { 
        if (shouldShowSecondary()) {
          return this.selectedLineGraph.primaryColor.getStyle();
        } else {
          return 'red';
        }
      }
    });
  }

  teardown() {
    super.teardown();
    this.autoBoundsCalculator.teardown();
    this.scaleLabel.teardown();
    this.probe.teardown();
    this.rangeBinder.teardown();
    this.autoButton.teardown();
  }

  showFunction(compiledFunction) {
    if (!this.constructor.isSupported(compiledFunction.signature)) {
      throw Error('The function signature ' + compiledFunction.signature + 'is unsupported');
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
    this.isMouseOver = true;
    this.selectedLineGraph = this;
  }

  onMouseMove(e) {
    this.mousePoint = [e.offsetX, e.offsetY];
    this.probeX = this.clientToLocalCoords(this.mousePoint)[0];
  }

  onMouseLeave(e) {
    this.isMouseOver = false;
    this.selectedLineGraph = null;
  }

  onPan(dx, dy) {
    if (this.autoButton.active) {
      this.translateRange(dx);
    } else {
      this.translateRange(dx, dy);
    }
  }

  onPanStop() {
    if (this.autoButton.active) {
      AutoBoundsCalculator.fireRecalcEvent([this.compiled.freeVariables[0].name]);
    }
  }

  onZoom(amount, mouseX, mouseY) {
    let zoomScale = .001;
    let zoomAmount = 1 + zoomScale*amount;
    let tX = mouseX/this.width;
    this.zoomRange('xRange', zoomAmount, tX);

    if (this.autoButton.active) {
      AutoBoundsCalculator.fireRecalcEvent([this.compiled.freeVariables[0].name], 50);
    } else {
      let tY = mouseY/this.height;
      this.zoomRange('yRange', zoomAmount, tY);
    }
  }
}