import type { DropAnimationFunction } from "@dnd-kit/dom";
import { getFrame } from "../get-frame";
import {
  COMMIT_ANIMATION,
  prefersReducedMotion,
  waitForCommit,
} from "./commit-animation";

type DropAnimationContext = Parameters<DropAnimationFunction>[0];

type TargetDrop = {
  itemId?: string;
  targetZone: string;
  getExpectedOrder: () => string[];
};

const parseTranslateValue = (value: string) => {
  if (!value || value === "none") return null;

  const [x, y = "0px"] = value.split(" ");
  const parsed = { x: parseFloat(x), y: parseFloat(y) };

  if (isNaN(parsed.x) || isNaN(parsed.y)) return null;

  return parsed;
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
 * Matches dnd-kit's default behavior when a drag needs to return to its
 * source placeholder, such as a canceled or invalid drop.
 */
export const runFallbackDropAnimation: DropAnimationFunction = ({
  element,
  feedbackElement,
  placeholder,
  translate,
}) => {
  const target = placeholder ?? element;
  const currentRect = feedbackElement.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const finalPosition = {
    x: targetRect.left + (targetRect.width - currentRect.width) / 2,
    y: targetRect.top + (targetRect.height - currentRect.height) / 2,
  };
  const win = feedbackElement.ownerDocument.defaultView ?? window;
  const currentTranslate =
    parseTranslateValue(
      win.getComputedStyle(feedbackElement as HTMLElement).translate
    ) ?? translate;
  const finalTranslate = {
    x: currentTranslate.x + finalPosition.x - currentRect.left,
    y: currentTranslate.y + finalPosition.y - currentRect.top,
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
        ? `[data-puck-component="${itemId}"] { visibility: hidden !important; }`
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
          [data-puck-component="${committedId}"] { visibility: hidden !important; }
        `;
      }

      const final = getRectInDocument(committed, overlayDoc);

      copy
        .animate(
          {
            translate: [
              "0px 0px 0",
              `${final.left - rect.left}px ${final.top - rect.top}px 0`,
            ],
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
