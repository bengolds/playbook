class Probe {
  constructor(graph, {
    locationCallback = graph.getProbePoint.bind(graph),
    visibilityCallback = function () {return true;},
    pointLabelCallback = function () {return '';},
    styles = {},
    horizAlign = 'right',
    vertAlign = 'top',
    labelMargin = 0
  }) {
    this.mathbox = graph.mathbox;
    this.overlayDiv = graph.overlayDiv;
    this.locationCallback = locationCallback;
    this.visibilityCallback = visibilityCallback;
    this.pointLabelCallback = pointLabelCallback;
    this.styles = styles;
    this.labelMargin = labelMargin;
    this.horizAlign = horizAlign;
    this.vertAlign = vertAlign;

    this.setupMathbox();
    this.setupOverlay();
    this.updateProbe();
  }

  setupMathbox() {
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
  }

  setupOverlay() {
    this.parentDiv = document.createElement('div');
    this.overlayDiv.appendChild(this.parentDiv);
    let divNames = ['xLabel', 'yLabel', 'pointLabel'];
    this.labels = {};
    for (let name of divNames) {
      let div = this.labels[name] = document.createElement('span');
      div.style = this.styles[name];
      div.innerText = name;
      div.classList.add(name);
      this.parentDiv.appendChild(div);
    }
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

  get xMargin() {
    switch(this.horizAlign) {
    case 'center':
      return 0;
    case 'left':
      return -this.labelMargin;
    case 'right':
      return this.labelMargin;
    }
  }

  get yMargin() {
    switch(this.vertAlign) {
    case 'center':
      return 0;
    case 'top':
      return this.labelMargin;
    case 'bottom':
      return -this.labelMargin;
    }
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

  updateProbe() {
    this.targetPoint = this.locationCallback();
    if (this.targetPoint) {
      this.labels.pointLabel.innerText = this.pointLabelCallback();
      this.labels.xLabel.innerText = this.targetPoint[0].toFixed(1);
      this.labels.yLabel.innerText = this.targetPoint[1].toFixed(1);

      this.layoutLabels();
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

  layoutLabels() {
    let width = this.overlayDiv.offsetWidth, height = this.overlayDiv.offsetHeight;
    let bb = {left: 0, right: 0, top: 0, bottom: 0 };

    let tX = util.inverseLerp(this.xRange, this.targetPoint[0]);
    let tY = util.inverseLerp(this.yRange, this.targetPoint[1]);
    let x = tX*width + this.xMargin;
    let y = tY*height + this.yMargin;

    //Place the point Label first
    let [plLeft, plBottom] = this.moveDivClamped(x, y,
     this.labels.pointLabel, bb, 
     this.horizAlign, this.vertAlign);

    //Place the xLabel so that it's to the left of the main label.
    bb = {left: 0, right: 0, top: height-plBottom, bottom: -Number.MAX_VALUE};
    this.moveDivClamped(x, 0, this.labels.xLabel, bb, this.horizAlign, 'top');

    //Place the yLabel so that it's to the bottom of the main label.
    bb = {left: -Number.MAX_VALUE, right: width-plLeft, top: 0, bottom: 0};
    this.moveDivClamped(0, y, this.labels.yLabel, bb, 'right', this.vertAlign);
  }

  moveDivClamped(targetX, targetY, div, boundingBox, horizAlign, vertAlign) {
    let width = this.overlayDiv.offsetWidth, height = this.overlayDiv.offsetHeight;

    //Set the X direction
    let targetLeft;
    switch (horizAlign) {
    case 'center':
      targetLeft = targetX - div.offsetWidth/2;
      break;
    case 'right':
      targetLeft = targetX;
      break;
    case 'left':
      targetLeft = targetX - div.offsetWidth;
      break;
    }
    let clampedLeft = Math.min(targetLeft, width-boundingBox.right-div.offsetWidth);
    clampedLeft = Math.max(clampedLeft, boundingBox.left);
    div.style.left = clampedLeft + 'px';

    //Set the Y direction
    let targetBottom;
    switch (vertAlign) {
    case 'center':
      targetBottom = targetY - div.offsetHeight/2;
      break;
    case 'top':
      targetBottom = targetY;
      break;
    case 'bottom':
      targetBottom = targetY - div.offsetHeight; 
      break;
    }
    let clampedBottom = Math.min(targetBottom, height-boundingBox.top-div.offsetHeight);
    clampedBottom = Math.max(clampedBottom, boundingBox.bottom);
    div.style.bottom = clampedBottom + 'px';

    return [clampedLeft, clampedBottom];
  }
}