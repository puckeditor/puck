import type { CSSProperties } from "react";
import { useRef, useState, useLayoutEffect, useMemo, useCallback } from "react";
import { getDeepScrollPosition } from "../../lib/get-deep-scroll-position";


type Pt = { x: number; y: number };
type Quad = { p1: Pt; p2: Pt; p3: Pt; p4: Pt };
type Mode = "fixed" | "absolute";

type UseOverlayTransformOptions = {
  container?: HTMLElement | null;
};

type OverlayTransformResult = {
  /** Axis-aligned frame style (no transform): left/top/width/height in container/page space */
  style: CSSProperties;
  recompute: () => void;
};

type OverlaySnap = {
  mode: Mode;
  width: number;
  height: number;
  matrix: DOMMatrix;
  quad: Quad;
  style: CSSProperties;
};

type LastSnapshot = {
  mode: Mode;
  /** Scaled output width/height used in style (not the unscaled box) */
  wStr: string;
  hStr: string;
  /** Left/top used in style */
  left: number;
  top: number;
  /** Position used in style */
  position: CSSProperties["position"];
};

export function useOverlayTransform(
  target: HTMLElement | null,
  options: UseOverlayTransformOptions = {}
): OverlayTransformResult {
  const container = options.container ?? null;

  const win = target?.ownerDocument?.defaultView ?? window;
  const doc = target?.ownerDocument ?? document;
  const body = doc.body;

  const [snap, setSnap] = useStateStable<OverlaySnap>({
    mode: "fixed",
    width: 0,
    height: 0,
    matrix: new DOMMatrix(),
    quad: { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 }, p3: { x: 0, y: 0 }, p4: { x: 0, y: 0 } },
    style: {
      position: "fixed",
      left: 0,
      top: 0,
      width: "0px",
      height: "0px",
    },
  });

  const last = useRef<LastSnapshot | null>(null);

  const scheduled = useRef(false);
  const schedule = () => {
    if (scheduled.current) return;
    scheduled.current = true;
    win.requestAnimationFrame(() => {
      scheduled.current = false;
      recompute();
    });
  };

  /** Recompute scale+translate-only, ignoring rotation/skew/perspective for the frame. */
  const recompute = useCallback(() => {
    // Detached → collapse once
    if (!target || !target.isConnected) {
      if (last.current && (snap.width !== 0 || snap.height !== 0)) {
        last.current = {
          mode: last.current.mode,
          wStr: "0px",
          hStr: "0px",
          left: 0,
          top: 0,
          position: last.current.position,
        };
        setSnap({
          mode: last.current.mode,
          width: 0,
          height: 0,
          matrix: new DOMMatrix(),
          quad: emptyQuad(),
          style: {
            position: last.current.position,
            left: 0,
            top: 0,
            width: "0px",
            height: "0px",
          },
        });
      }
      return;
    }

    // Mode, quad, untransformed size
    const mode = detectMode(win, doc, body, target);
    const quad = getQuad(target);

    const rect = target.getBoundingClientRect();
    const baseWidth = target.offsetWidth || rect.width || 0;
    const baseHeight = target.offsetHeight || rect.height || 0;
    if (baseWidth === 0 || baseHeight === 0) {
      const position = last.current?.position ?? (mode === "fixed" ? "fixed" : "absolute");
      if (!last.current || last.current.wStr !== "0px" || last.current.hStr !== "0px") {
        last.current = { mode, wStr: "0px", hStr: "0px", left: 0, top: 0, position };
        setSnap({
          mode,
          width: 0,
          height: 0,
          matrix: new DOMMatrix(),
          quad,
          style: { position, left: 0, top: 0, width: "0px", height: "0px" },
        });
      }
      return;
    }

    // Build viewport-space mapping [0..w]×[0..h] -> quad
    const Mvp = matrixFromRectToQuadViewport(baseWidth, baseHeight, quad);

    // Convert transform into container/page space
    const { matrix: M, position } = toContainerSpace(win, Mvp, mode, container, body);

    // Compute axis-aligned frame: left/top from bounding rect, width/height from scale
    // (Rotation/skew are intentionally ignored.)
    const { x: left, y: top } = viewportPointToContainer(win, mode, container, body, rect.left, rect.top);

    let scaleX = 1;
    let scaleY = 1;
    if (M.is2D) {
      // Decompose scale from 2D matrix columns: [a c e; b d f]
      // scaleX = length of first column; scaleY = length of second column
      scaleX = Math.hypot(M.a, M.b);
      scaleY = Math.hypot(M.c, M.d);
    } else {
      // Perspective: approximate scales from viewport quad edge lengths
      const vx = Math.hypot(quad.p2.x - quad.p1.x, quad.p2.y - quad.p1.y) / Math.max(1, baseWidth);
      const vy = Math.hypot(quad.p4.x - quad.p1.x, quad.p4.y - quad.p1.y) / Math.max(1, baseHeight);
      scaleX = vx || 1;
      scaleY = vy || 1;
    }

    const wOut = baseWidth * scaleX;
    const hOut = baseHeight * scaleY;
    const wStr = `${wOut}px`;
    const hStr = `${hOut}px`;

    // Change detection (now includes left/top because transform is not used)
    const prev = last.current;
    if (
      prev &&
      prev.mode === mode &&
      prev.wStr === wStr &&
      prev.hStr === hStr &&
      prev.left === left &&
      prev.top === top &&
      prev.position === position
    ) {
      return; // no-op
    }

    last.current = { mode, wStr, hStr, left, top, position };

    setSnap({
      mode,
      width: baseWidth,
      height: baseHeight,
      matrix: M, // still expose the full matrix for consumers who want it
      quad,
      style: {
        position,
        left,
        top,
        width: wStr,
        height: hStr,
        // No transform here: we intentionally ignore rotation/skew/perspective for the overlay UI
        // as this can cause the action bar to scale/rotate unexpectedly.
      },
    });
  }, [body, container, doc, snap.height, snap.width, target, win]);

  useLayoutEffect(() => {
    if (!target) return;

    const nodes = new Set<(Element | Window)>([
      ...getScrollableAncestors(win, doc, body, target),
      ...(container ? getScrollableAncestors(win, doc, body, container) : []),
      ...(container ? [container] : []),
    ]);

    const onScroll = () => schedule();
    nodes.forEach((n) => n.addEventListener("scroll", onScroll, { passive: true }));

    const onResize = () => schedule();
    win.addEventListener("resize", onResize);

    const vv = win.visualViewport;
    const onVV = () => schedule();
    vv?.addEventListener("resize", onVV);
    vv?.addEventListener("scroll", onVV);

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => schedule());
      ro.observe(target);
    }

    let mo: MutationObserver | undefined;
    if (typeof MutationObserver !== "undefined") {
      mo = new MutationObserver(() => schedule());
      mo.observe(target, { attributes: true, attributeFilter: ["style", "class"] });
    }

    recompute();

    return () => {
      nodes.forEach((n) => n.removeEventListener("scroll", onScroll));
      win.removeEventListener("resize", onResize);
      vv?.removeEventListener("resize", onVV);
      vv?.removeEventListener("scroll", onVV);
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [target, container]);

  return useMemo(() => {
    return {
      style: snap.style,
      recompute,
    };
  }, [snap.style, recompute]);
}

/** Persisted state setter that skips updates when the next value is shallow-equal. */
function useStateStable<T>(initial: T) {
  const [value, setValue] = useState(initial);
  const set = (next: T) => {
    setValue((prev) => (shallowEqual(prev, next) ? prev : next));
  };
  return [value, set] as const;
}

/** Lightweight shallow comparison used to prevent redundant state writes. */
function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const ak = Object.keys(a as Record<string, unknown>);
  const bk = Object.keys(b as Record<string, unknown>);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  }
  return true;
}

/** Decide whether to position the overlay as fixed or absolute based on transforms. */
function detectMode(
  win: Window & typeof globalThis,
  doc: Document,
  body: HTMLElement,
  el: HTMLElement
): Mode {
  const cs = win.getComputedStyle(el);
  if (cs.position === "fixed") return "fixed";
  const htmlT = win.getComputedStyle(doc.documentElement).transform;
  const bodyT = win.getComputedStyle(body).transform;
  if (htmlT && htmlT !== "none") return "absolute";
  if (bodyT && bodyT !== "none") return "absolute";
  return "absolute";
}

/** Collect all scrollable ancestors (plus the window) that should trigger recompute. */
function getScrollableAncestors(
  win: Window & typeof globalThis,
  doc: Document,
  body: HTMLElement,
  el: HTMLElement
): Array<Element | Window> {
  const out: Array<Element | Window> = [];
  let cur: HTMLElement | null = el.parentElement;
  while (cur && cur !== body && cur !== doc.documentElement) {
    const s = win.getComputedStyle(cur);
    if (/(auto|scroll|overlay)/i.test(s.overflowX) || /(auto|scroll|overlay)/i.test(s.overflowY)) {
      out.push(cur);
    }
    cur = cur.parentElement;
  }
  out.push(win);
  return out;
}

/** Retrieve the element quad, preferring precise Box Quads when available. */
function getQuad(el: Element): Quad {

  const r = el.getBoundingClientRect();
  return {
    p1: { x: r.left, y: r.top },
    p2: { x: r.right, y: r.top },
    p3: { x: r.right, y: r.bottom },
    p4: { x: r.left, y: r.bottom },
  };
}

/** Check if a quad is effectively a parallelogram (no perspective). */
function isParallelogram(q: Quad): boolean {
  const eps = 0.25;
  return (
    Math.abs(q.p1.x + q.p3.x - (q.p2.x + q.p4.x)) < eps &&
    Math.abs(q.p1.y + q.p3.y - (q.p2.y + q.p4.y)) < eps
  );
}

/** Multiply two 3x3 matrices. */
function multiply3x3(A: number[][], B: number[][]): number[][] {
  const R = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      R[r][c] = A[r][0] * B[0][c] + A[r][1] * B[1][c] + A[r][2] * B[2][c];
    }
  }
  return R;
}

/** Multiply a 3x3 matrix by a 3-vector. */
function multiply3x3Vec(A: number[][], v: [number, number, number]): [number, number, number] {
  return [
    A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2],
    A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2],
    A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2],
  ];
}

/** Invert a 3x3 matrix; fall back to identity when near-singular. */
function invert3x3(M: number[][]): number[][] {
  const [[a, b, c], [d, e, f], [g, h, i]] = M;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;
  const det = a * A + b * B + c * C;
  // Near-zero determinant means the matrix cannot be inverted reliably.
  if (Math.abs(det) < 1e-12) return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const inv = 1 / det;
  return [
    [A * inv, D * inv, G * inv],
    [B * inv, E * inv, H * inv],
    [C * inv, F * inv, I * inv],
  ];
}

/** Build a basis matrix that maps unit vectors to the three provided points. */
function basisToPoints(p0: Pt, p1: Pt, p2: Pt, p3: Pt): number[][] {
  const M = [
    [p0.x, p1.x, p2.x],
    [p0.y, p1.y, p2.y],
    [1, 1, 1],
  ];
  const invM = invert3x3(M);
  const v = multiply3x3Vec(invM, [p3.x, p3.y, 1]);
  return [
    [M[0][0] * v[0], M[0][1] * v[1], M[0][2] * v[2]],
    [M[1][0] * v[0], M[1][1] * v[1], M[1][2] * v[2]],
    [M[2][0] * v[0], M[2][1] * v[1], M[2][2] * v[2]],
  ];
}

/** Compute a homography that maps a rectangle of size w×h to the given quad. */
function homographyRectToQuad(w: number, h: number, q: Quad): number[][] {
  const src0 = { x: 0, y: 0 };
  const src1 = { x: w, y: 0 };
  const src2 = { x: w, y: h };
  const src3 = { x: 0, y: h };
  return multiply3x3(
    basisToPoints(q.p1, q.p2, q.p3, q.p4),
    invert3x3(basisToPoints(src0, src1, src2, src3))
  );
}

/** Convert a width/height-aligned rect into a viewport-space matrix for the quad. */
function matrixFromRectToQuadViewport(w: number, h: number, q: Quad): DOMMatrix {
  if (isParallelogram(q)) {
    const a = (q.p2.x - q.p1.x) / w;
    const b = (q.p2.y - q.p1.y) / w;
    const c = (q.p4.x - q.p1.x) / h;
    const d = (q.p4.y - q.p1.y) / h;
    const e = q.p1.x;
    const f = q.p1.y;
    return new DOMMatrix([a, b, c, d, e, f]);
  }
  const H = homographyRectToQuad(w, h, q);
  return new DOMMatrix([
    H[0][0], H[1][0], 0, H[2][0],
    H[0][1], H[1][1], 0, H[2][1],
    0,       0,       1, 0,
    H[0][2], H[1][2], 0, H[2][2],
  ]);
}

/** Translate the viewport matrix into container/page space and report positioning mode. */
function toContainerSpace(
  win: Window & typeof globalThis,
  Mvp: DOMMatrix,
  mode: Mode,
  container: HTMLElement | null,
  body: HTMLElement
): { matrix: DOMMatrix; position: CSSProperties["position"] } {
  if (container && container !== body) {
    const cr = container.getBoundingClientRect();
    const sc = getDeepScrollPosition(container);
    const T = new DOMMatrix().translate(-cr.left + sc.x, -cr.top + sc.y, 0);
    return { matrix: T.multiply(Mvp), position: "absolute" };
  }
  if (mode === "fixed") return { matrix: Mvp, position: "fixed" };
  const Ts = new DOMMatrix().translate(win.scrollX, win.scrollY, 0);
  return { matrix: Ts.multiply(Mvp), position: "absolute" };
}

/** Convert a viewport point (x,y) into container/page space to use as left/top. */
function viewportPointToContainer(
  win: Window & typeof globalThis,
  mode: Mode,
  container: HTMLElement | null,
  body: HTMLElement,
  vx: number,
  vy: number
): Pt {
  if (container && container !== body) {
    const cr = container.getBoundingClientRect();
    const sc = getDeepScrollPosition(container);
    // Adjust viewport coords so they align with the container's internal scroll offset.
    return { x: vx - cr.left + sc.x, y: vy - cr.top + sc.y };
  }
  if (mode === "fixed") return { x: vx, y: vy };
  return { x: vx + win.scrollX, y: vy + win.scrollY };
}


/** Zeroed-out quad used when an element is detached or size-less. */
function emptyQuad(): Quad {
  return { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 }, p3: { x: 0, y: 0 }, p4: { x: 0, y: 0 } };
}
