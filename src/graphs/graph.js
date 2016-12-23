class Graph {
  constructor(mathbox, syncedParameters) {
    this.mathbox = mathbox;
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

  static isSupported(functor) {
    let supportedDims = this.supportedDimensions;
    let numInputDimensions = functor.unboundVars.length;
    let filtered = supportedDims.filter((signature) => {
      return signature[0] == numInputDimensions;
    });
    return filtered.length != 0;
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
    return this.tweenerTargets[name] || this[name];
  }
}