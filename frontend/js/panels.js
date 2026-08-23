const Panels = {
  MIN_WIDTH: 180,
  DEFAULT_WIDTH: 260,

  init() {
    this.restore();
    document.getElementById('resizer-left')?.addEventListener('pointerdown', e => this.startDrag(e, 'left'));
    document.getElementById('resizer-right')?.addEventListener('pointerdown', e => this.startDrag(e, 'right'));
  },

  sidebar(side) {
    return document.querySelector(side === 'left' ? '.left-sidebar' : '.right-sidebar');
  },

  startDrag(e, side) {
    const el = this.sidebar(side);
    if (!el) return;
    e.preventDefault();

    const startX = e.clientX;
    const startWidth = el.getBoundingClientRect().width;

    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      const width = Math.max(this.MIN_WIDTH, Math.round(side === 'left' ? startWidth + delta : startWidth - delta));
      el.style.width = width + 'px';
      el.style.flex = '0 0 auto';
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.classList.remove('resizing');
      const width = parseInt(el.style.width, 10);
      try {
        localStorage.setItem(`modelfield-panel-${side}`, String(width));
      } catch (err) {}
    };

    document.body.classList.add('resizing');
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  },

  restore() {
    ['left', 'right'].forEach(side => {
      let width;
      try {
        width = parseInt(localStorage.getItem(`modelfield-panel-${side}`), 10);
      } catch (err) {}
      if (!width || width < this.MIN_WIDTH) width = this.DEFAULT_WIDTH;
      const el = this.sidebar(side);
      if (el) {
        el.style.width = width + 'px';
        el.style.flex = '0 0 auto';
      }
    });
  }
};
