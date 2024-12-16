class BarGraph extends Graph {

  constructor (params={}) {
    super(params);
    this.setupMathbox();

    this.rangeBinder = new RangeBinder(this);
    this.scaleLabel = new ScaleLabel(this, {
      visibleCallback: () => {return this.isMouseOver;},
      rangeBinder: this.rangeBinder
    });

    this.barProbeX = 0;
    this.probe = new Probe(this, {
      visibleCallback: () => {return this.isMouseOver;}, 
      pointLabelCallback: this.getProbeLabel.bind(this),
      styles: {
        topLine: {opacity: 0},
        bottomLine: {opacity: 0},
        leftLine: {opacity: 0},
        rightLine: {opacity: 0},
        yLabel: 'display: none'
      },
      horizAlign: 'center'
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
      'isMouseOver',
      'barProbeX',
      'barProbeVisible'
    ];
  }

  isNatural() {
    return this.compiled.domain[0] == SETS.NATURAL;
  }

  //Setup & Teardown

  setupMathbox () {
    this._exprAnimDuration = 500;

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
        let scaleEmit = (r, g, b, a) => {emit(r*2,g*2,b*2,a);};
        if (this.barProbeVisible && this.indexToLocalCoord(i) == this.barProbeX) {
          scaleEmit(1, 0, 0, 1);
        } else {
          scaleEmit(...this.primaryColor.toArray(), 1);
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

    if (this.xRange && this.xRange[1]-this.xRange[0] < 10) {
      let center = this.xRange[0] + (this.xRange[1]-this.xRange[0])/2;
      let newXRange = [center-5, center+5];
      this.setRange('xRange', newXRange);
    }

  }

  teardown() {
    super.teardown();
    this.autoBoundsCalculator.teardown();
    this.scaleLabel.teardown();
    this.probe.teardown();
    this.rangeBinder.teardown();
    this.autoButton.teardown();
  }

  get numBars() {
    return Math.ceil(this.xRange[1])-Math.floor(this.xRange[0]) + 1;
  }

  showFunction(compiledFunction) {
    if (!this.constructor.isSupported(compiledFunction.signature)) {
      throw Error('The function signature ' + compiledFunction.signature + 'is unsupported');
    }

    this.changeExpr(this.makeExpr(compiledFunction));
    this.compiled = compiledFunction;

    if (this.isNatural()) {
      this.clampBounds(true);
    }
    
    this.autoBoundsCalculator.getNewBounds();
    this.mathbox.inspect();
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
      xAxisLabel: xAxisLabel,
    };
  }

  evalAt(x) {
    if (this.compiled) {
      let freeVars = this.compiled.freeVariables;
      let scope = {
        [freeVars[0].name]: x
      };
      let val = this.compiled.eval(scope);
      return val;
    }
    else { return 0; }
  }

  getProbePoint() {
    return [this.barProbeX, this.evalAt(this.barProbeX)];
  }

  getProbeLabel() {
    return this.evalAt(this.barProbeX).toFixed(1);
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
    this.isMouseOver = true;
    this.barProbeVisible = true;
  }

  onMouseLeave(e) {
    this.isMouseOver = false;
    this.barProbeVisible = false;
  }

  onMouseMove(e) {
    let mousePoint = [e.offsetX, e.offsetY];
    this.barProbeX = Math.round(this.clientToLocalCoords(mousePoint)[0]);
  }

  onPan(dx, dy) {
    if (this.autoButton.active) {
      this.translateRange(dx);
    } else {
      this.translateRange(dx, dy);
    }
    if (this.isNatural()) {
      this.clampBounds(false);
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
    let t = mouseX/this.width;
    this.zoomRange('xRange', zoomAmount, t);
    if (this.isNatural()) {
      this.clampBounds(true);
    }

    if (this.autoButton.active) {
      AutoBoundsCalculator.fireRecalcEvent([this.compiled.freeVariables[0].name], 50);
    } else {
      let tY = mouseY/this.height;
      this.zoomRange('yRange', zoomAmount, tY);
    }
  }

}