class Graph {
  constructor(mathbox, syncedParameters={}, animated) {
    if (new.target === Graph) {
      throw new TypeError('Cannot construct Graph instances directly');
    }
    this.mathbox = mathbox;
    this.animated = animated;
    this.syncedParameters = syncedParameters;
    this.setupSyncedParameters(syncedParameters);
    this.tweeners = {};
    this.tweenerTargets = {};
  }

  setupSyncedParameters(syncedParameters) {
    for (let paramName of this.constructor.syncedParameterNames) {
      Object.defineProperty(this, paramName, {
        get: () => {
          return syncedParameters[paramName];
        },
        set: (val) => {
          syncedParameters[paramName] = val;
          return val;
        },
      });
    }
  }

  static isSupported(signature) {
    let domains = this.supportedSignatures.domains;
    let ranges = this.supportedSignatures.ranges;
    let matchingDomains = domains.filter((domain) => {
      //MAYBE NEED TO SORT THESE FIRST
      return JSON.stringify(signature.domain) == JSON.stringify(domain);
    });
    let matchingRanges = ranges.filter((range) => {
      //MAYBE NEED TO SORT THESE FIRST
      return JSON.stringify(signature.range) == JSON.stringify(range);
    });

    return matchingDomains.length != 0 && matchingRanges.length != 0;
  }

  static humanizeBounds(minMax) {
    let minY = minMax[0], maxY = minMax[1];

    // Apply some tricks to the resulting values to get a good range
    if (minY == Number.NEGATIVE_INFINITY) {
      minY = -10;
    }
    if (maxY == Number.POSITIVE_INFINITY) {
      maxY = 10;
    }
    if (minY == maxY) {
      minY = minY - 5;
      maxY = maxY + 5;
    }
    minY = Math.min(minY, 0);
    maxY = Math.max(maxY, 0);
    return [minY, maxY];
  }

  animateRange(name, targetRange, duration=250, easing='easeInOutSine') {
    if (!(name in this.tweeners)) {
      this.tweeners[name] = new Tweenable();
    }

    let tweener = this.tweeners[name];
    if (tweener.isPlaying()) {
      tweener.stop();
    }

    let startRange = this[name];
    if (!startRange) {
      this[name] = targetRange;
    } 
    else {
      tweener.tween({
        from:     {min:  startRange[0], max:  startRange[1]},
        to:       {min: targetRange[0], max: targetRange[1]},
        duration: duration,
        easing:   easing,
        step: (state) => {
          this[name] = [state.min, state.max];
        }
      });
      this.tweenerTargets[name] = targetRange;
    }
  }

  getFinal(name) {
    if (this.tweenerTargets[name] && this.tweeners[name].isPlaying())
    {
      return this.tweenerTargets[name];
    }
    else {
      return this[name];
    }
  }

  setRange(name, value, animated=this.animated) {
    if (animated) {
      this.animateRange(name, value, 250, 'easeOutSine');
    }
    else {
      this[name] = value;
    } 
  }

  vectorToRange(vector) {
    return [vector.x, vector.y];
  }

  translateRange(dx, dy) {
    if (dx) {
      let scale = (this.xRange[0]-this.xRange[1])/this.width;
      let change = dx * scale;
      let newRange = [this.xRange[0]+change, this.xRange[1]+change];
      this.setRange('xRange', newRange, false);
    }
    if (dy) {
      let scale = (this.yRange[0]-this.yRange[1])/this.height;
      let change = -dy * scale;
      let newRange = [this.yRange[0]+change, this.yRange[1]+change];
      this.setRange('yRange', newRange, false);
    }
  }

  zoomRange(name, scale, tFocus) {
    let range = this.getFinal(name);
    let width = range[1] - range[0];
    let focusPoint = range[0] + width*tFocus;
    let newWidth = width*scale;
    let newRange = [focusPoint-tFocus*newWidth, focusPoint+(1-tFocus)*newWidth];
    this.setRange(name, newRange);
  }

  get width() {
    return this.mathbox.three.canvas.offsetWidth;
  }

  get height() {
    return this.mathbox.three.canvas.offsetHeight;
  }

  //TO IMPLEMENT:
  setup() {}
  teardown() {}
  showFunction(compiledFunction) {}
  unboundRanges() {}
  static get supportedSignatures() {return [];}
  static get syncedParameterNames() {return [];}
  //Mouse events
  onPanStart() {}
  onPan(dx, dy) {}
  onPanStop() {}
  onZoom(amount) {}
}