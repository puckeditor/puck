import type { DropAnimationFunction } from "@dnd-kit/dom";
import {
  DOMRectangle,
  getComputedStyles,
  parseTranslate,
} from "@dnd-kit/dom/utilities";
import { getFrame } from "../get-frame";
import {
  COMMIT_ANIMATION,
  prefersReducedMotion,
  waitForCommit,
} from "./commit-animation";
import { getComponentSelector } from "../dom-selectors";

type DropAnimationContext = Parameters<DropAnimationFunction>[0];

type TargetDrop = {
  itemId?: string;
  targetZone: string;
  getExpectedOrder: () => string[];
};

const getFrameTransform = (element: Element, boundary: Element | null) => {
  const transform = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
  let frame = element.ownerDocument.defaultView
    ?.frameElement as HTMLIFrameElement | null;

  while (frame && frame !== boundary) {
    const rect = frame.getBoundingClientRect();
    const scaleX = frame.offsetWidth ? rect.width / frame.offsetWidth : 1;
    const scaleY = frame.offsetHeight ? rect.height / frame.offsetHeight : 1;

    transform.x += rect.left;
    transform.y += rect.top;
    transform.scaleX *= scaleX;
    transform.scaleY *= scaleY;
    frame = frame.ownerDocument.defaultView
      ?.frameElement as HTMLIFrameElement | null;
  }

  return transform;
};

const getRectInDocument = (element: HTMLElement, doc: Document) => {
  const rect = element.getBoundingClientRect();

  if (element.ownerDocument === doc) {
    return rect;
  }

  const transform = getFrameTransform(
    element,
    doc.defaultView?.frameElement ?? null
  );

  return {
    left: rect.left * transform.scaleX + transform.x,
    top: rect.top * transform.scaleY + transform.y,
    width: rect.width * transform.scaleX,
    height: rect.height * transform.scaleY,
  };
};

/**
 * Runs the `"fluid"` drop animation.
 */
export const runFallbackDropAnimation: DropAnimationFunction = ({
  element,
  feedbackElement,
  placeholder,
  translate,
}) => {
  if (prefersReducedMotion(feedbackElement.ownerDocument)) return;

  const target = placeholder ?? element;

  // Skip the (costly) frame transform when both elements live in the same
  // document, matching dnd-kit's default.
  const sameFrame = feedbackElement.ownerDocument === target.ownerDocument;
  const options = { frameTransform: sameFrame ? null : undefined };
  const current = new DOMRectangle(feedbackElement, options);
  const final = new DOMRectangle(target, options);

  const currentTranslate =
    parseTranslate(getComputedStyles(feedbackElement).translate) ?? translate;

  // Centre-align the feedback onto the target, matching dnd-kit's default.
  const finalTranslate = {
    x: currentTranslate.x - (current.center.x - final.center.x),
    y: currentTranslate.y - (current.center.y - final.center.y),
  };

  feedbackElement.setAttribute("data-dnd-dropping", "");

  return feedbackElement
    .animate(
      {
        translate: [
          `${currentTranslate.x}px ${currentTranslate.y}px 0`,
          `${finalTranslate.x}px ${finalTranslate.y}px 0`,
        ],
      },
      COMMIT_ANIMATION
    )
    .finished.catch(() => undefined)
    .then(() => {
      feedbackElement.removeAttribute("data-dnd-dropping");
    });
};

/**
 * Runs the `"static"` drop animation.
 *
 * Commits a valid drop immediately, then glides a visual copy from the
 * pointer to the final rendered item in the canvas.
 */
export const runTargetDropAnimation = ({
  feedbackElement,
  itemId,
  targetZone,
  getExpectedOrder,
}: {
  feedbackElement: HTMLElement;
  itemId?: string;
  targetZone: string;
  getExpectedOrder: () => string[];
}) => {
  const overlayDoc = feedbackElement.ownerDocument;
  const targetDoc = getFrame() ?? overlayDoc;

  if (prefersReducedMotion(overlayDoc)) return;

  const rect = feedbackElement.getBoundingClientRect();
  const initialExpectedOrder = getExpectedOrder();
  const copy = feedbackElement.cloneNode(true) as HTMLElement;

  copy.removeAttribute("id");
  copy.removeAttribute("popover");
  copy.removeAttribute("data-puck-component");
  copy.removeAttribute("data-puck-dnd");
  copy.removeAttribute("data-dnd-dragging");
  copy.setAttribute("inert", "true");

  Object.assign(copy.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    overflow: "hidden",
    pointerEvents: "none",
    transform: "none",
    transition: "none",
    translate: "none",
    zIndex: "2147483647",
  });

  const hideStyle = targetDoc.createElement("style");
  hideStyle.textContent = `
    ${
      itemId
        ? `${getComponentSelector(itemId)} { visibility: hidden !important; }`
        : ""
    }
    [data-puck-overlay] { opacity: 0 !important; }
  `;

  targetDoc.head.appendChild(hideStyle);
  overlayDoc.body.appendChild(copy);

  const cleanup = () => {
    copy.remove();
    hideStyle.remove();
  };

  waitForCommit(
    targetDoc,
    {
      zones: [targetZone],
      itemId,
      targetZone,
      getExpectedOrder,
      initialExpectedOrder,
    },
    (committed) => {
      if (!committed) {
        cleanup();

        return;
      }

      const committedId = committed.getAttribute("data-puck-component");

      if (!itemId && committedId) {
        hideStyle.textContent += `
          ${getComponentSelector(
            committedId
          )} { visibility: hidden !important; }
        `;
      }

      const final = getRectInDocument(committed, overlayDoc);

      // Glide with `left`/`top` rather than a `translate` keyframe. WebKit runs
      // accelerated properties (translate) on the compositor but width/height
      // on the main thread, and the post-drop React commit blocks the main
      // thread, so on Safari the translate races ahead of the width changes and
      // the still-narrow clone swept sideways before the size caught up.
      copy
        .animate(
          {
            left: [`${rect.left}px`, `${final.left}px`],
            top: [`${rect.top}px`, `${final.top}px`],
            width: [`${rect.width}px`, `${final.width}px`],
            height: [`${rect.height}px`, `${final.height}px`],
          },
          { ...COMMIT_ANIMATION, fill: "forwards" }
        )
        .finished.catch(() => undefined)
        .then(cleanup);
    }
  );
};

/**
 * Sends valid committed drops to their rendered destination and canceled or
 * invalid drops back to dnd-kit's source placeholder.
 */
export const runDropAnimation = (
  context: DropAnimationContext,
  target?: TargetDrop
) => {
  const operation = context.source.manager?.dragOperation;
  const aborted =
    (operation?.canceled ?? false) || operation?.target?.type === "void";

  if (!aborted && target) {
    runTargetDropAnimation({
      ...target,
      feedbackElement: context.feedbackElement as HTMLElement,
    });

    // Resolve immediately so dnd-kit commits and cleans up while the visual
    // copy independently glides to the newly rendered component.
    return;
  }

  return runFallbackDropAnimation(context);
};
