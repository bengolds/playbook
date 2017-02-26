class GraphButton {
  constructor(graph, {
    css = '',
    toggles = false,
    icon = 'star',
    text = '',
    onTap = () => {},
    visibleCallback = () => {return true;}
  }) {
    this.overlayDiv = graph.overlayDiv;
    this.onTap = onTap;
    this.visibleCallback = visibleCallback;

    this.groupDiv = document.createElement('div');
    this.overlayDiv.appendChild(this.groupDiv);
    this.groupDiv.style.cssText = 'height: 100%';

    //Create the button.
    if (text === '') {
      this.button = document.createElement('paper-icon-button');
      this.button.icon = icon;
    } else {
      this.button = document.createElement('paper-button');
      this.button.textContent = text;
    }
    this.button.toggles = true;
    this.button.style.cssText = css;
    this.button.addEventListener('tap', this.tapped.bind(this));
    this.groupDiv.appendChild(this.button);

    this.updateVisibility();
  }

  teardown() {
    this.overlayDiv.removeChild(this.groupDiv);
    window.cancelAnimationFrame(this.requestId);
    this.requestId = null;
  }

  get active() {
    return this.button.active;
  }
  set active(val) {
    this.button.active = val;
  }

  tapped() {
    this.onTap();
  }

  updateVisibility() {
    if (this.visibleCallback()) {
      this.groupDiv.classList.remove('hidden');
    } else {
      this.groupDiv.classList.add('hidden');
    }

    this.requestId = window.requestAnimationFrame(this.updateVisibility.bind(this));
  }
}