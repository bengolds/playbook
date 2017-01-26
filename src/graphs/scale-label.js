class ScaleLabel {
  constructor(parentDiv, textCallback, visibleCallback) {
    this.textCallback = textCallback;
    this.visibleCallback = visibleCallback;
    this.parentDiv = parentDiv;
  }

  setup() {
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
    for (let name in this.labels) {
      let node = this.labels[name];
      this.parentDiv.removeChild(node);
    } 
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
        this.show();
      } else {
        this.hide();
      }
    }

    this.requestId = window.requestAnimationFrame(this.updateLabels.bind(this));
  }

  show() {
    for (let key in this.labels) {
      this.labels[key].classList.remove('hidden');
    }
  }

  hide() {
    for (let key in this.labels) {
      this.labels[key].classList.add('hidden');
    }
  }
}