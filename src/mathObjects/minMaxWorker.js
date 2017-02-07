importScripts('compiledFunction.js', 
  'scope.js',
  '../../bower_components/mathjs/dist/math.js');

let getMinMax = function(compiled, unboundRanges, maxSamples = 1e5) {
  _checkRangesMatchVariables(compiled, unboundRanges);

  if (compiled.variables.length == 0) {
    return [compiled.eval(), compiled.eval()];
  }

  let ranges = _combineRanges(compiled, unboundRanges);
  let samples = _sampleFunction(compiled, ranges, maxSamples);
  samples = _discardOutliers(samples);

  let bounds = samples.reduce( (range, sample) => {
    range[0] = Math.min(range[0], sample);
    range[1] = Math.max(range[1], sample);
    return range;
  }, [Number.MAX_VALUE, -Number.MAX_VALUE]);

  return bounds;
};

let _combineRanges = function(compiled, unboundRanges) {
  let ranges = Object.assign({}, unboundRanges);
  for (let variable of compiled.variables) {
    let pinnedIndex = compiled.globalScope.indexOfPinnedVar(variable.name);
    if (pinnedIndex != -1) {
      ranges[variable.name] = compiled.globalScope.pinnedVariables[pinnedIndex].range;
    }
  }
  return ranges;
};

let _sampleFunction = function(compiled, ranges, maxSamples) {
  let numDimensions = compiled.variables.length;
  let maxSamplesPerDimension = Math.round(Math.pow(maxSamples, 1/numDimensions));

  let samples = [];
  let scope = {};
  let iterate = (dimension) => {
    let currVar = compiled.variables[dimension];
    let currBounds = ranges[currVar.name].bounds;
    let numSteps = Math.min(ranges[currVar.name].steps, maxSamplesPerDimension);
    let boundsWith = currBounds[1]-currBounds[0];
    for (let i = 0; i < numSteps; i++) {
      let x = currBounds[0] + boundsWith * (i/(numSteps-1));
      scope[currVar.name] = x;
      if (dimension == numDimensions-1) {
        let sample = compiled.evalWithoutGlobalScope(scope);
        if (math.im(sample) == 0 && isFinite(sample)) {
          samples.push(sample);
        }
      } else {
        iterate(dimension+1);
      }
    }
  };
  iterate(0);
  return samples;
};

let _discardOutliers = function(samples) {
  let copiedSamples = samples.slice();
  let numCycles = 5;
  for (let i = 0; i < numCycles; i++) {
    if (samples.length == 0) {
      return [-5, 5];
    }
    let mean = math.mean(samples);
    let stddev = math.std(samples);
    let numSigmas = 10;
    let bottomBracket = mean - stddev * numSigmas;
    let topBracket = mean + stddev * numSigmas;

    copiedSamples = copiedSamples.filter( (val) => {
      return val > bottomBracket && val < topBracket;
    });
  }
  return copiedSamples;
};

let _checkRangesMatchVariables = function(compiled, unboundRanges) {
  for (let variable of compiled.variables) {
    if (!(variable.name in unboundRanges) &&
      !compiled.globalScope.isPinned(variable.name)) {
      throw Error('No range found (unbound or pinned) for ' + variable.name);
    }
  }
};

onmessage = function(e) {
  let compiled = CompiledFunction.rehydrate(e.data.dehydratedFunction);
  let bounds = getMinMax(compiled, e.data.unboundRanges);

  postMessage(bounds);
};

