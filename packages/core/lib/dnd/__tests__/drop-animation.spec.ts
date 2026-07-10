import { runTargetDropAnimation } from "../drop-animation";

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

  return element;
};

describe("runTargetDropAnimation", () => {
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

  it("animates a new drawer item to its inferred committed element", () => {
    const zone = document.createElement("div");
    const existing = makeItem("existing", 100);
    const feedback = document.createElement("div");
    let expectedOrder = ["existing"];

    zone.setAttribute("data-puck-dropzone", "root:slot");
    zone.append(existing);
    document.body.append(zone, feedback);
    feedback.getBoundingClientRect = () => rect(300);

    runTargetDropAnimation({
      feedbackElement: feedback,
      targetZone: "root:slot",
      getExpectedOrder: () => expectedOrder,
    });

    const inserted = makeItem("inserted", 0);
    expectedOrder = ["inserted", "existing"];
    zone.prepend(inserted);
    animationFrames.forEach((callback) => callback(0));

    const copy = document.body.querySelector<HTMLElement>(
      '[inert][style*="2147483647"]'
    );

    expect(copy).not.toBeNull();
    expect(copy?.animate).toHaveBeenCalledWith(
      {
        translate: ["0px 0px 0", "0px -300px 0"],
        width: ["100px", "100px"],
        height: ["100px", "100px"],
      },
      { duration: 250, easing: "ease", fill: "forwards" }
    );
  });
});
