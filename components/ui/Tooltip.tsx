"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

type TooltipChildProps = HTMLAttributes<HTMLElement> & {
  className?: string;
};

type TooltipProps = {
  content: ReactNode;
  children: ReactElement<TooltipChildProps>;
  delayMs?: number;
};

export function Tooltip({ content, children, delayMs = 150 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearDelay() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function show() {
    clearDelay();
    timeoutRef.current = setTimeout(() => setVisible(true), delayMs);
  }

  function hide() {
    clearDelay();
    setVisible(false);
  }

  if (!isValidElement(children)) {
    return children;
  }

  return (
    <span className="relative inline-flex max-w-full">
      {cloneElement(children, {
        onMouseEnter: (event) => {
          children.props.onMouseEnter?.(event);
          show();
        },
        onMouseLeave: (event) => {
          children.props.onMouseLeave?.(event);
          hide();
        },
        onFocus: (event) => {
          children.props.onFocus?.(event);
          show();
        },
        onBlur: (event) => {
          children.props.onBlur?.(event);
          hide();
        },
        "aria-describedby": visible ? tooltipId : undefined,
      })}
      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-max max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border border-border bg-surface px-3 py-2.5 text-left shadow-md motion-reduce:transition-none"
        >
          <span
            aria-hidden
            className="absolute -top-1.5 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-b-[6px] border-x-transparent border-b-border"
          />
          <span
            aria-hidden
            className="absolute -top-[5px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-b-[5px] border-x-transparent border-b-surface"
          />
          {content}
        </span>
      )}
    </span>
  );
}
