import { prepareCommitFlip } from "../flip-commit";

jest.mock("../../get-frame", () => ({
  getFrame: () => document,
}));

const rect = (top: number): DOMRect =>
  ({
    top,
    bottom: top + 100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: top,
    toJSON: () => {},
  } as DOMRect);

const makeItem = (id: string, top: number) => {
  const element = document.createElement("div");

  element.setAttribute("data-puck-component", id);
  element.getBoundingClientRect = () => rect(top);
  element.animate = jest.fn() as typeof element.animate;

  return element;
};

describe("commit animations", () => {
  let animationFrames: FrameRequestCallback[];

  beforeEach(() => {
    animationFrames = [];
    document.body.innerHTML = "";
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      animationFrames.push(callback);

      return 1;
    }) as typeof window.requestAnimationFrame;
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      writable: true,
      value: jest.fn(() => ({ finished: Promise.resolve() })),
    });
  });

  const flushAnimationFrame = () => {
    const callbacks = animationFrames;
    animationFrames = [];
    callbacks.forEach((callback) => callback(0));
  };

  it("infers a newly inserted item and animates its displaced siblings", () => {
    const zone = document.createElement("div");
    const first = makeItem("first", 0);
    const second = makeItem("second", 100);
    let expectedOrder = ["first", "second"];

    zone.setAttribute("data-puck-dropzone", "root:slot");
    zone.append(first, second);
    document.body.appendChild(zone);

    const play = prepareCommitFlip({
      zones: ["root:slot"],
      targetZone: "root:slot",
      getExpectedOrder: () => expectedOrder,
    });

    const inserted = makeItem("inserted", 0);
    first.getBoundingClientRect = () => rect(100);
    second.getBoundingClientRect = () => rect(200);
    expectedOrder = ["inserted", "first", "second"];
    zone.prepend(inserted);

    play();
    flushAnimationFrame();

    expect(first.animate).toHaveBeenCalledWith(
      { translate: ["0px -100px 0", "0px 0px 0"] },
      { duration: 250, easing: "ease" }
    );
    expect(second.animate).toHaveBeenCalledWith(
      { translate: ["0px -100px 0", "0px 0px 0"] },
      { duration: 250, easing: "ease" }
    );
  });
});
