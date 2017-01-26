class ScaleLabel {
  constructor(overlayDiv, textCallback, visibleCallback) {
    this.textCallback = textCallback;
    this.visibleCallback = visibleCallback;
    this.overlayDiv = overlayDiv;
  }

  setup() {
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
    let labelTexts = this.textCallback();
    for (let key in this.labels) {
      this.labels[key].innerText = labelTexts[key] || '';
    }
    if (this.visibleCallback) {
      if (this.visibleCallback()) {
        this.parentDiv.classList.remove('hidden');
      } else {
        this.parentDiv.classList.add('hidden');
      }
    }

    this.requestId = window.requestAnimationFrame(this.updateLabels.bind(this));
  }
}