class BarGraph extends Graph {

  constructor (params={}) {
    super(params);
    this.setupMathbox();

    this.scaleLabel = new ScaleLabel(this, {
      visibleCallback: () => {return this.labelsVisible;}
    });

    this.barProbeX = 0;
    this.probe = new Probe(this, {
      visibilityCallback: () => {return true;}, 
      pointLabelCallback: () => {return 'hey';},
      styles: {
        topLine: {opacity: 0},
        bottomLine: {opacity: 0},
        leftLine: {opacity: 0},
        rightLine: {opacity: 0},
        xLabel: 'transform: translate(-50%, 0%)',        
        pointLabel: 'transform: translate(-50%, 0%)',        
        yLabel: 'display: none'
      },
      labelMargin: 0
    });

    this.autoBoundsCalculator = new AutoBoundsCalculator(this, {});
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
      'labelsVisible',
      'barProbeX',
      'barProbeVisible'
    ];
  }

  isNatural() {
    return this.compiled.getDomain()[0] == SETS.NATURAL;
  }

  //Setup & Teardown

  setupMathbox () {
    this._exprAnimDuration = 500;
    
    let view = this.mathbox.select('cartesian'); 
    let ranges = view.get('range');
    this.setRange('xRange', this.vectorToRange(ranges[0]), false);
    this.setRange('yRange', this.vectorToRange(ranges[1]), false);
    
    view.bind('range', ()=>{
      return [this.xRange, this.yRange];
    });

    this.data = this.mathboxGroup.array({
      channels: 2,
      items: 4,
      id: 'barGraphData'
    }, {
      width: () => {return this.numBars; }
    });

    this.colors = this.mathboxGroup.array({
      channels: 4,
      id: 'barGraphColors',
      expr: (emit, i) => {
        //FUCKING MATHBOX HAS COLORS IN A RANGE FROM 0-2
        if (this.barProbeVisible && this.indexToLocalCoord(i) == this.barProbeX) {
          emit(2, 0, 0, 1);
        } else {
          emit(0.34375, 1.125, 2, 1);
        }
      }
    }, {
      width: () => {return this.numBars;}
    });

    this.mathboxGroup.face({
      width: 5,
      colors: '#' + this.colors.get('id'),
      points: '#' + this.data.get('id'),
      zIndex: 3,
    });

    this.dataAnim = this.mathboxGroup.play({
      target: '#' + this.data.get('id'),
      pace: this._exprAnimDuration/1000,
    });

    if (this.xRange[1]-this.xRange[0] < 10) {
      let center = this.xRange[0] + (this.xRange[1]-this.xRange[0])/2;
      let newXRange = [center-5, center+5];
      this.setRange('xRange', newXRange);
    }

  }

  teardown() {
    super.teardown();
    this.view.unbind('range');
    this.autoBoundsCalculator.teardown();
    this.scaleLabel.teardown();
    this.probe.teardown();
  }

  get numBars() {
    return Math.ceil(this.xRange[1])-Math.floor(this.xRange[0]) + 1;
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
    
    this.autoBoundsCalculator.getNewBounds();
    this.mathbox.inspect();
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

  indexToLocalCoord(i) {
    return Math.floor(this.xRange[0]) + i;
  }

  makeExpr(compiledFunction) {
    let cachedEval = compiledFunction.eval.bind(compiledFunction);
    let freeVars = compiledFunction.freeVariables;
    let cachedVarName = '_';
    if (freeVars.length == 1) {
      cachedVarName = freeVars[0].name;
    }
    let newExpr = (emit, i) => {
      let x = this.indexToLocalCoord(i);
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

  getProbePoint() {
    if (this.compiled) {
      let freeVars = this.compiled.freeVariables;
      let scope = {
        [freeVars[0].name]: this.barProbeX,
      };
      let val = this.compiled.eval(scope);
      return [this.barProbeX, val];
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

  clampBounds(animated) {
    let xRange = this.getFinal('xRange');
    if (xRange[0] < 0) {
      this.setRange('xRange', [0, xRange[1]-xRange[0]], animated);
    }
  }

  onMouseEnter(e) {
    this.labelsVisible = true;
    this.barProbeVisible = true;
  }

  onMouseLeave(e) {
    this.labelsVisible = false;
    this.barProbeVisible = false;
  }

  onMouseMove(e) {
    let mousePoint = [e.offsetX, e.offsetY];
    this.barProbeX = Math.round(this.clientToLocalCoords(mousePoint)[0]);
  }

  onPan(dx, dy) {
    this.translateRange(dx);
    if (this.isNatural()) {
      this.clampBounds(false);
    }
  }

  onPanStop() {
    this.autoBoundsCalculator.getNewBounds();
  }

  onZoom(amount, mouseX, mouseY) {
    let zoomScale = .001;
    let zoomAmount = 1 + zoomScale*amount;
    let t = mouseX/this.width;
    this.zoomRange('xRange', zoomAmount, t);
    if (this.isNatural()) {
      this.clampBounds(true);
    }

    this.autoBoundsCalculator.getNewBounds(50);
  }

}