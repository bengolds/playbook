class Probe {
  constructor(mathbox, overlayDiv, locationCallback, visibilityCallback) {
    this.mathbox = mathbox;
    this.overlayDiv = overlayDiv;
    this.locationCallback = locationCallback;
    this.visibilityCallback = visibilityCallback;
  }

  setup() {
    this.view = this.mathbox.select('cartesian'); 
    this.group = this.view.group({
      id: 'probeGroup'
    });

    let pointGroupNames = ['bottomLinePoints', 'topLinePoints', 
      'leftLinePoints', 'rightLinePoints'];
    for (let name of pointGroupNames) {
      this.group.array({
        channels: 2,
        expr: (emit, i) => {
          emit(...this.getPoints(name)[i]);
        },
        width: 2
      })
      .line({
        width: 2,
        color: '#FF0000',
        zIndex: 2
      });
    }

    //Add something for color graph here
    this.parentDiv = document.createElement('div');
    this.overlayDiv.appendChild(this.parentDiv);
    let divNames = ['xLabel', 'yLabel'];
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
    case 'bottomLinePoints':
      return [[x, bottom], [x, y]];
    case 'topLinePoints':
      return [[x, y],      [x, top]];
    case 'leftLinePoints':
      return [[left, y],   [x, y]];
    case 'rightLinePoints':
      return [[x, y],      [right, y]];
    }
  }

  updateProbe() {
    this.targetPoint = this.locationCallback();
    if (this.targetPoint) {
      let width = this.overlayDiv.offsetWidth, height = this.overlayDiv.offsetHeight;
      let margin = 4;

      let tX = util.inverseLerp(this.xRange, this.targetPoint[0]);
      this.labels.xLabel.innerText = this.targetPoint[0].toFixed(1);
      let left = Math.min(tX*width + margin, width-this.labels.xLabel.offsetWidth);
      this.labels.xLabel.style.left = left + 'px';

      let tY = util.inverseLerp(this.yRange, this.targetPoint[1]);
      this.labels.yLabel.innerText = this.targetPoint[1].toFixed(1);
      let bottom = Math.min(tY*height + margin, height-this.labels.xLabel.offsetHeight);
      this.labels.yLabel.style.bottom = bottom + 'px';
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