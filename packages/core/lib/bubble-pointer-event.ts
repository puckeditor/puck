export interface BubbledPointerEventType extends PointerEvent {
  originalTarget: EventTarget | null;
}

// Necessary for environments without DOM
class EventShim {
  type: string;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented: boolean;

  constructor(
    type: string,
    data: { bubbles?: boolean; cancelable?: boolean } = {}
  ) {
    this.type = type;
    this.bubbles = !!data.bubbles;
    this.cancelable = !!data.cancelable;
    this.defaultPrevented = false;
  }

  preventDefault() {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }

  stopPropagation() {}
  stopImmediatePropagation() {}
}

// Necessary to enable server build
const BaseEvent =
  typeof PointerEvent !== "undefined"
    ? PointerEvent
    : typeof Event !== "undefined"
    ? Event
    : EventShim;

export class BubbledPointerEvent extends BaseEvent {
  _originalTarget: EventTarget | null = null;

  constructor(
    type: string,
    data: PointerEvent & { originalTarget: EventTarget | null }
  ) {
    super(type, data);
    this.originalTarget = data.originalTarget;
  }

  // Necessary for Firefox
  set originalTarget(target: EventTarget | null) {
    this._originalTarget = target;
  }

  // Necessary for Firefox
  get originalTarget() {
    return this._originalTarget;
  }
}
