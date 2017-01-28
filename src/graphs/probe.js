class Probe {
  constructor(params) {
    this.mathbox = params.mathbox;
    this.overlayDiv = params.overlayDiv;
    this.locationCallback = params.locationCallback;
    this.visibilityCallback = params.visibilityCallback;
    this.pointLabelCallback = params.pointLabelCallback || function() {return '';};
    this.styles = params.styles || {};
  }

  setup() {
    this.view = this.mathbox.select('cartesian'); 
    this.group = this.view.group({
      id: 'probeGroup'
    });

    let defaultLineStyle = {
      width: 2,
      color: '#FF0000',
      zIndex: 2
    };
    let lineNames = ['bottomLine', 'topLine', 'leftLine', 'rightLine'];
    for (let name of lineNames) {
      let lineStyle = Object.assign({}, defaultLineStyle, this.styles[name]);

      this.group.array({
        channels: 2,
        expr: (emit, i) => {
          emit(...this.getPoints(name)[i]);
        },
        width: 2
      })
      .line(lineStyle);
    }

    this.parentDiv = document.createElement('div');
    this.overlayDiv.appendChild(this.parentDiv);
    let divNames = ['xLabel', 'yLabel', 'pointLabel'];
    this.labels = {};
    for (let name of divNames) {
      let div = this.labels[name] = document.createElement('span');
      div.innerText = name;
      div.classList.add(name);
      this.parentDiv.appendChild(div);
    }
    this.mathbox.inspect();

    this.updateProbe();
  }

  teardown() {
    this.mathbox.remove('#' + this.group.get('id'));
    this.overlayDiv.removeChild(this.parentDiv);
    window.cancelAnimationFrame(this.requestId);
    this.requestId = null;
  }

  get xRange() {
    let range = this.view.get('range');
    return range[0].toArray();
  }

  get yRange() {
    let range = this.view.get('range');
    return range[1].toArray();
  }

  getPoints(name) {
    if (!this.targetPoint) {
      return [[0,0],[0,0]];
    }
    let x = this.targetPoint[0], y = this.targetPoint[1];
    let left = this.xRange[0], right = this.xRange[1], 
      bottom = this.yRange[0], top = this.yRange[1];

    switch(name) {
    case 'bottomLine':
      return [[x, bottom], [x, y]];
    case 'topLine':
      return [[x, y],      [x, top]];
    case 'leftLine':
      return [[left, y],   [x, y]];
    case 'rightLine':
      return [[x, y],      [right, y]];
    }
  }

  moveDivClamped(left, bottom, div, boundingBox) {
    let width = this.overlayDiv.offsetWidth, height = this.overlayDiv.offsetHeight;
    if (left != null) {
      let clampedLeft = Math.min(left, width-boundingBox.right-div.offsetWidth);
      clampedLeft = Math.max(clampedLeft, boundingBox.left);
      div.style.left = clampedLeft + 'px';
    }
    if (bottom != null) {
      let clampedBottom = Math.min(bottom, height-boundingBox.top-div.offsetHeight);
      clampedBottom = Math.max(clampedBottom, boundingBox.bottom);
      div.style.bottom = clampedBottom + 'px';
    }
  }

  updateProbe() {
    this.targetPoint = this.locationCallback();
    if (this.targetPoint) {
      let width = this.overlayDiv.offsetWidth, height = this.overlayDiv.offsetHeight;
      let bb = {left: 0, right: 0, top: 0, bottom: 0 };
      let margin = 4;

      let tX = util.inverseLerp(this.xRange, this.targetPoint[0]);
      let tY = util.inverseLerp(this.yRange, this.targetPoint[1]);
      let left = tX*width + margin;
      let bottom = tY*height + margin;

      this.labels.pointLabel.innerText = this.pointLabelCallback();
      this.moveDivClamped(left, bottom, this.labels.pointLabel, bb);

      bb = {left: 0, right: 0, top: height-bottom, bottom: -Number.MAX_VALUE};
      this.labels.xLabel.innerText = this.targetPoint[0].toFixed(1);
      this.moveDivClamped(left, 0, this.labels.xLabel, bb);

      bb = {left: -Number.MAX_VALUE, right: width-left, top: 0, bottom: 0};
      this.labels.yLabel.innerText = this.targetPoint[1].toFixed(1);
      this.moveDivClamped(0, bottom, this.labels.yLabel, bb);

      bb.left += this.labels.yLabel.offsetWidth;
    }

    if (this.visibilityCallback) {
      if (this.visibilityCallback()) {
        this.parentDiv.classList.remove('hidden');
        this.group.set('visible', true);
      } else {
        this.parentDiv.classList.add('hidden');
        this.group.set('visible', false);
      }
    }

    this.requestId = window.requestAnimationFrame(this.updateProbe.bind(this));
  }
}