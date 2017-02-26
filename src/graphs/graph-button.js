class GraphButton {
  constructor(graph, {
    css = '',
    toggles = false,
    icon = 'star',
    onTap = () => {}
  }) {
    this.overlayDiv = graph.overlayDiv;
    this.onTap = onTap;

    this.groupDiv = document.createElement('div');
    this.overlayDiv.appendChild(this.groupDiv);
    this.groupDiv.style.cssText = 'height: 100%';

    this.button = document.createElement('paper-icon-button');
    this.button.icon = icon;
    this.button.toggles = true;
    this.button.style.cssText = css;
    this.button.addEventListener('tap', this.tapped.bind(this));
    this.groupDiv.appendChild(this.button);
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

  teardown() {
    this.overlayDiv.removeChild(this.groupDiv);
  }
}