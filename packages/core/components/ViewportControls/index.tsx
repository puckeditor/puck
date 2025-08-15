import {
  Expand,
  Monitor,
  Smartphone,
  Tablet,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { IconButton } from "../IconButton";
import { useAppStore } from "../../store";
import { ReactNode, SyntheticEvent, useEffect, useMemo, useState } from "react";
import { getClassNameFactory } from "../../lib";

import styles from "./styles.module.css";
import { Viewport } from "../../types";

const icons = {
  Smartphone: <Smartphone size={16} />,
  Tablet: <Tablet size={16} />,
  Monitor: <Monitor size={16} />,
  FullWidth: <Expand size={16} />,
};

const getClassName = getClassNameFactory("ViewportControls", styles);
const getClassNameButton = getClassNameFactory("ViewportButton", styles);

const ActionButton = ({
  children,
  title,
  onClick,
  isActive,
  disabled,
}: {
  children: ReactNode;
  title: string;
  onClick: (e: SyntheticEvent) => void;
  isActive?: boolean;
  disabled?: boolean;
}) => {
  return (
    <span className={getClassNameButton({ isActive })}>
      <IconButton
        type="button"
        title={title}
        disabled={disabled || isActive}
        onClick={onClick}
      >
        <span className={getClassNameButton("inner")}>{children}</span>
      </IconButton>
    </span>
  );
};

// Based on Chrome dev tools
const defaultZoomOptions = [
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "100%", value: 1 },
  { label: "125%", value: 1.25 },
  { label: "150%", value: 1.5 },
  { label: "200%", value: 2 },
];

export const ViewportControls = ({
  autoZoom,
  zoom,
  onViewportChange,
  onZoom,
  fullScreen,
}: {
  autoZoom: number;
  zoom: number;
  onViewportChange: (viewport: Viewport) => void;
  onZoom: (zoom: number) => void;
  fullScreen?: boolean;
}) => {
  const viewports = useAppStore((s) => s.viewports);
  const uiViewports = useAppStore((s) => s.state.ui.viewports);

  const defaultsContainAutoZoom = defaultZoomOptions.find(
    (option) => option.value === autoZoom
  );

  const zoomOptions = useMemo(
    () =>
      [
        ...defaultZoomOptions,
        ...(defaultsContainAutoZoom
          ? []
          : [
              {
                value: autoZoom,
                label: `${(autoZoom * 100).toFixed(0)}% (Auto)`,
              },
            ]),
      ]
        .filter((a) => a.value <= autoZoom)
        .sort((a, b) => (a.value > b.value ? 1 : -1)),
    [autoZoom]
  );

  const [activeViewport, setActiveViewport] = useState(
    uiViewports.current.width
  );

  useEffect(() => {
    setActiveViewport(uiViewports.current.width);
  }, [uiViewports.current]);

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={getClassName({ isExpanded, fullScreen })}>
      <div className={getClassName("actions")}>
        <div className={getClassName("actionsInner")}>
          {viewports.map((viewport, i) => (
            <ActionButton
              key={i}
              title={
                viewport.label
                  ? `Switch to ${viewport.label} viewport`
                  : "Switch viewport"
              }
              onClick={() => {
                setActiveViewport(viewport.width);
                onViewportChange(viewport);
              }}
              isActive={activeViewport === viewport.width}
            >
              {typeof viewport.icon === "string"
                ? icons[viewport.icon as keyof typeof icons] || viewport.icon
                : viewport.icon || icons.Smartphone}
            </ActionButton>
          ))}
          <div className={getClassName("divider")} />
          <ActionButton
            title="Zoom viewport out"
            disabled={zoom <= zoomOptions[0]?.value}
            onClick={(e) => {
              e.stopPropagation();
              onZoom(
                zoomOptions[
                  Math.max(
                    zoomOptions.findIndex((option) => option.value === zoom) -
                      1,
                    0
                  )
                ].value
              );
            }}
          >
            <ZoomOut size={16} />
          </ActionButton>
          <ActionButton
            title="Zoom viewport in"
            disabled={zoom >= zoomOptions[zoomOptions.length - 1]?.value}
            onClick={(e) => {
              e.stopPropagation();

              onZoom(
                zoomOptions[
                  Math.min(
                    zoomOptions.findIndex((option) => option.value === zoom) +
                      1,
                    zoomOptions.length - 1
                  )
                ].value
              );
            }}
          >
            <ZoomIn size={16} />
          </ActionButton>

          <div className={getClassName("zoom")}>
            <div className={getClassName("divider")} />
            <select
              className={getClassName("zoomSelect")}
              value={zoom.toString()}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onChange={(e) => {
                onZoom(parseFloat(e.currentTarget.value));
              }}
            >
              {zoomOptions.map((option) => (
                <option
                  key={option.label}
                  value={option.value}
                  label={option.label}
                />
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        className={getClassName("toggleButton")}
        title="Toggle viewport menu"
        onClick={() => setIsExpanded((s) => !s)}
      >
        {isExpanded ? <X size={16} /> : <Monitor size={16} />}
      </button>
    </div>
  );
};
