class ScaleLabel {
  constructor(graph, {visibleCallback = function() {return true;},
                      textCallback = graph.getLabelText.bind(graph)}) {
    this.textCallback = textCallback;
    this.visibleCallback = visibleCallback;
    this.overlayDiv = graph.overlayDiv;
    this.graph = graph;

    this.parentDiv = document.createElement('div');
    this.overlayDiv.appendChild(this.parentDiv);

    let divNames = ['xMinLabel', 'xMaxLabel', 'xAxisLabel', 
      'yMinLabel', 'yMaxLabel', 'yAxisLabel'];
    this.labels = {};
    for (let name of divNames) {
      let div = this.labels[name] = document.createElement('span');
      div.innerText = name;
      div.classList.add(name);
      this.parentDiv.appendChild(div);
    }

    this.updateLabels();
  }

  teardown() {
    this.overlayDiv.removeChild(this.parentDiv);
    window.cancelAnimationFrame(this.requestId);
    this.requestId = null;
  }

  updateLabels() {
    let numDigits = 1;
    let defaultLabels = {
      xMinLabel: this.graph.xRange[0].toFixed(numDigits),
      xMaxLabel: this.graph.xRange[1].toFixed(numDigits),
      yMinLabel: this.graph.yRange[0].toFixed(numDigits),
      yMaxLabel: this.graph.yRange[1].toFixed(numDigits),
      xAxisLabel: '',
      yAxisLabel: '',
    };

    let labelTexts = this.textCallback();
    labelTexts = Object.assign({}, defaultLabels, labelTexts);

    for (let key in this.labels) {
      this.labels[key].innerText = labelTexts[key] || '';
    }
    if (this.visibleCallback()) {
      this.parentDiv.classList.remove('hidden');
    } else {
      this.parentDiv.classList.add('hidden');
    }

    this.requestId = window.requestAnimationFrame(this.updateLabels.bind(this));
  }
}