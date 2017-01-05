class LineGraph extends Graph {

  constructor (mathbox, syncedParameters, animated) {
    super(mathbox, syncedParameters, animated);

    this._exprAnimDuration = 500;
    this._resetBoundsDuration = 250;
    this.labelsVisible = true;
  }

  static get supportedSignatures() {
    return {
      domains: [
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
    ];
  }

  //Setup & Teardown

  setup () {
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
    this.domId = 'linedom';

    this.data = view.interval({
      channels: 2,
      fps: 60,
      id: this.dataId,
      width: 500
    });
    this.display = view.line({
      width: 5,
      color: '#3090FF',
      zIndex: 1,
      id: this.displayId
    });
    this.dataAnim = this.mathbox.play({
      target: '#' + this.dataId,
      pace: this._exprAnimDuration/1000,
      id: this.animId
    });

    if (this.mathbox.select('#'+this.domId).length == 0) {
      view.layer({})
      .array({
        width: 4,
        expr: (emit, i) => {
          let xWidth = this.width/this.height;
          switch(i) {
          case 0:
            emit(-xWidth, -1);
            break;
          case 1:
            emit(xWidth, -1);
            break;
          case 2:
            emit(xWidth, -1);
            break;
          case 3:
            emit(xWidth, 1);
            break;
          }
        },
        channels: 2 
      })
      .html(    {
        width: 4,
        expr: (emit, el, i) => {
          var text = '';
          var style = {
            position: 'absolute',
            'user-select': 'none'
          };
          switch(i) {
          case 0: 
            text = this.xRange[0].toFixed(1);
            style.left = '4px';
            style.bottom = '0px';
            break;
          case 1:
            text = this.xRange[1].toFixed(1);
            style.right = '24px';
            style.bottom = '0px';
            break;
          case 2:
            text = this.yRange[0].toFixed(1);
            style.right = '4px';
            style.bottom = '16px';
            break;
          case 3:
            text = this.yRange[1].toFixed(1);
            style.right = '4px';
            style.top = '0px';
            break;
          }
          emit(el('span', {style: style, innerHTML: text}));
        },
      })
      .dom({
        id: this.domId,
        // depth: .5,
        size: 12,
        // snap: true,
        // points: '<<',
        offset: [0,0],
        outline: 2,
        // color: '#000',
        zIndex: 2,
      }, {
        opacity: () => {return this.labelsVisible ? 1: 0;}
      });
    }

  }

  teardown() {
    this.mathbox.remove('#'+this.dataId);
    this.mathbox.remove('#'+this.displayId);
    this.mathbox.remove('#'+this.animId);
    this.labelsVisible = false;
  }

  showFunction(compiledFunction) {
    if (!this.constructor.isSupported(compiledFunction.getSignature())) {
      throw Error('The function signature ' + compiledFunction.getSignature() + 'is unsupported');
    }

    this.compiled = compiledFunction;
    let cachedEval = compiledFunction.eval.bind(compiledFunction);
    let cachedVarName = compiledFunction.freeVariables[0].name;
    let newExpr = (emit, x) => {
      emit(x, cachedEval({
        [cachedVarName]: x
      }));
    };
    this.changeExpr(newExpr);
    this.resetBounds(this._exprAnimDuration, 'easeInOutSine');
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

  //Ranges

  resetBounds(animDuration=this._resetBoundsDuration, animEasing='easeOutSine') {
    var newRange = this.compiled.getMinMax(this.unboundRanges());
    newRange = this.constructor.humanizeBounds(newRange);
    if (this.animated) {
      this.animateRange('yRange', newRange, animDuration, animEasing);
    } 
    else {
      this.setRange('yRange', newRange);
    }
  }

  unboundRanges() {
    let ranges = {};
    let unboundVar = this.compiled.freeVariables[0];
    ranges[unboundVar.name] = this.getFinal('xRange');
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
    this.resetBounds();
  }
}