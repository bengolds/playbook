class ColorGraph extends Graph {

  constructor (params={}) {
    super(params);
    this.setupMathbox();

    this.scaleLabel = new ScaleLabel(this.overlayDiv, 
      this.getLabelText.bind(this),
      () => {return this.labelsVisible;});

    if (this.probeX === undefined) {
      this.probeX = 0;
    }
    if (this.probeY === undefined) {
      this.probeY = 0;
    }
    this.probe = new Probe({
      mathbox: this.mathbox,
      overlayDiv: this.overlayDiv,
      locationCallback: this.getProbePoint.bind(this),
      visibilityCallback: () => {return this.probeVisible;}, 
      pointLabelCallback: this.getProbeLabel.bind(this),
      styles: {
        topLine: {opacity: 0.5},
        rightLine: {opacity: 0.5}
      }
    });

    this.autoBoundsCalculator = new AutoBoundsCalculator(this, {
      boundsReceivedCallback: this.newRangeReceived.bind(this)
    });
    this.scaleLabel.setup();
    this.probe.setup();
  }

  static get supportedSignatures() {
    return {
      domains: [
        [SETS.REAL, SETS.REAL],
        [SETS.COMPLEX],
      ],
      ranges: [
        [SETS.REAL], 
        [SETS.INTEGER],
        [SETS.NATURAL]
      ],
    };
  }

  static get syncedParameterNames() {
    return [
      'xRange',
      'yRange',
      'labelsVisible',
      'probeVisible',
      'probeX',
      'probeY'
    ];
  }

  setupMathbox () {

    //TODO: ADJUST BY ASPECT RATIO
    let dim = 100;
    let view = this.mathbox.select('cartesian'); 
    let ranges = view.get('range');
    this.setRange('xRange', this.vectorToRange(ranges[0]), false);
    this.setRange('yRange', this.vectorToRange(ranges[1]), false);
    this.setRange('colorRange', [-5, 5]);

    view.bind('range', ()=>{
      return [this.xRange, this.yRange];
    });

    this.flat = this.mathboxGroup.area({
      channels: 3,
      width: dim,
      height: dim,
      expr: (emit, x, y) => {
        emit(x, y, 0);
      }
    });
    this.data = this.mathboxGroup.area({
      channels: 4,
      width: dim,
      height: dim
    });
    this.display = this.mathboxGroup.surface({
      colors: '<',
      points: '<<',
    });
    this.dataAnim = this.mathboxGroup.play({
      target: '<',
      pace: 1,
    });

    this.mathbox.select('grid').set('visible', false);

    this.setRange('yRange', this.getFinal('xRange'));
  }

  teardown() {
    super.teardown();
    this.mathbox.select('grid').set('visible', true);
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
    let newExpr = (emit, x, y) => {
      let val = cachedEval({
        [freeVars[0].name]: x,
        [freeVars[1].name]: y
      });
      emit (...this.colorMap(val), 1);
    };
    return newExpr;
  }

  colorMap(val) {
    if (typeof val != 'number') {
      return [0,0,0];
    }
    let t = (val-this.colorRange[0])/(this.colorRange[1]-this.colorRange[0]);
    let i = Math.round(t*warmCoolMap.length);
    i = Math.min(Math.max(0, i), warmCoolMap.length-1);
    let color = warmCoolMap[i];
    //FUCKING MATHBOX HAS COLORS IN A RANGE FROM 0-2
    return [color[0]*2, color[1]*2, color[2]*2];
  }
   
  getLabelText() {
    let numDigits = 1;
    let xAxisLabel = '';
    let yAxisLabel = '';
    if (this.compiled) {
      xAxisLabel = this.compiled.freeVariables[0].name;
      yAxisLabel = this.compiled.freeVariables[1].name;
    }
    //Move this into the label class?
    return {
      xMinLabel: this.xRange[0].toFixed(numDigits),
      xMaxLabel: this.xRange[1].toFixed(numDigits),
      yMinLabel: this.yRange[0].toFixed(numDigits),
      yMaxLabel: this.yRange[1].toFixed(numDigits),
      xAxisLabel: xAxisLabel,
      yAxisLabel: yAxisLabel,
    };
  }

  getProbePoint() {
    return [this.probeX, this.probeY];
  }

  getProbeLabel() {
    if (this.compiled) {
      let freeVars = this.compiled.freeVariables;
      let scope = {
        [freeVars[0].name]: this.probeX,
        [freeVars[1].name]: this.probeY,
      };
      let val = this.compiled.eval(scope);
      if (val.toFixed) {
        return val.toFixed(1);
      } else {
        return '';
      }
    }
  }

  //Ranges

  newRangeReceived(e) {
    let minMax = this.constructor.humanizeBounds(e.data);
    let largestDisplacement = Math.max(Math.abs(minMax[0]), Math.abs(minMax[1]));
    let newRange = [-largestDisplacement, largestDisplacement];
    if (this.animated) {
      this.animateRange('colorRange', newRange);
    } 
    else {
      this.setRange('colorRange', newRange);
    }
  }

  unboundRanges() {
    let freeVars = this.compiled.freeVariables;
    if (freeVars.length == 2) {
      return {
        [freeVars[0].name]: {
          bounds: this.getFinal('xRange'),
          steps: 200
        },
        [freeVars[1].name]: {
          bounds: this.getFinal('yRange'),
          steps: 200
        }
      };
    } else {
      let realRange = this.getFinal('xRange');
      let imRange = this.getFinal('yRange');
      return {
        [freeVars[0].name]: {
          bounds: [
            math.complex(realRange[0], imRange[0]),
            math.complex(realRange[1], imRange[1])
          ],
          steps: 200
        },
      };
    }
  }

  // Mouse events
  onMouseEnter(e) {
    this.labelsVisible = true;
    this.probeVisible = true;
  }

  onMouseMove(e) {
    let mousePoint = [e.offsetX, e.offsetY];
    let localCoords = this.clientToLocalCoords(mousePoint);
    this.probeX = localCoords[0];
    this.probeY = localCoords[1];
  }

  onMouseLeave(e) {
    this.labelsVisible = false;
    this.probeVisible = false;
  }

  onPan(dx, dy) {
    this.translateRange(dx, dy);
  }

  onPanStop() {
    this.autoBoundsCalculator.getNewBounds();
  }

  onZoom(amount, mouseX, mouseY) {
    let zoomScale = .001;
    let zoomAmount = 1 + zoomScale*amount;
    let tX = mouseX/this.width;
    let tY = mouseY/this.height;
    this.zoomRange('xRange', zoomAmount, tX);
    this.zoomRange('yRange', zoomAmount, tY);

    this.autoBoundsCalculator.getNewBounds(50);
  }
}