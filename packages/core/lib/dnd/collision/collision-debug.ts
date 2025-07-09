import { Point } from "@dnd-kit/geometry";

const DEBUG = false;

const debugElements: Record<
  string,
  { svg: SVGSVGElement; line: SVGLineElement; text: SVGTextElement }
> = {};

let timeout: NodeJS.Timeout;

export const collisionDebug = (
  a: Point,
  b: Point,
  id: string,
  color: string,
  label?: string | null
) => {
  if (!DEBUG) return;

  const debugId = `${id}-debug`;

  clearTimeout(timeout);

  timeout = setTimeout(() => {
    Object.entries(debugElements).forEach(([id, { svg }]) => {
      svg.remove();

      delete debugElements[id];
    });
  }, 1000);

  requestAnimationFrame(() => {
    const existingEl = debugElements[debugId];

    let line = debugElements[debugId]?.line;
    let text = debugElements[debugId]?.text;

    if (!existingEl) {
      const svgNs = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNs, "svg");
      line = document.createElementNS(svgNs, "line");
      text = document.createElementNS(svgNs, "text");

      // svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svg.setAttribute("id", debugId);
      svg.setAttribute(
        "style",
        "position: fixed; height: 100%; width: 100%; pointer-events: none; top: 0px; left: 0px;"
      );
      svg.appendChild(line);
      svg.appendChild(text);

      text.setAttribute("fill", `black`);

      document.body.appendChild(svg);

      debugElements[debugId] = { svg, line, text };
    }

    line.setAttribute("x1", a.x.toString());
    line.setAttribute("x2", b.x.toString());
    line.setAttribute("y1", a.y.toString());
    line.setAttribute("y2", b.y.toString());
    line.setAttribute("style", `stroke:${color};stroke-width:2`);

    text.setAttribute("x", (a.x - (a.x - b.x) / 2).toString());
    text.setAttribute("y", (a.y - (a.y - b.y) / 2).toString());

    if (label) {
      text.innerHTML = label;
    }
  });
};
