interface Position {
  x: number;
  y: number;
}

export class GlobalPosition {
  target: Element;
  original: Position;
  private scaleFactor: number = 1;
  private frameEl: HTMLIFrameElement | null = null;
  private frameRect: DOMRect | null = null;

  constructor(target: Element, original: Position) {
    this.target = target;
    this.original = original;

    this.frameEl = document.querySelector("iframe#preview-frame");

    if (this.frameEl) {
      this.frameRect = this.frameEl.getBoundingClientRect();

      this.scaleFactor =
        this.frameRect.width / (this.frameEl.contentWindow?.innerWidth || 1);
    }
  }

  get x() {
    return this.original.x;
  }

  get y() {
    return this.original.y;
  }

  get global() {
    if (document !== this.target.ownerDocument && this.frameRect) {
      return {
        x: this.x * this.scaleFactor + this.frameRect.left,
        y: this.y * this.scaleFactor + this.frameRect.top,
      };
    }

    return this.original;
  }

  get frame() {
    if (document === this.target.ownerDocument && this.frameRect) {
      return {
        x: (this.x - this.frameRect.left) / this.scaleFactor,
        y: (this.y - this.frameRect.top) / this.scaleFactor,
      };
    }

    return this.original;
  }
}
