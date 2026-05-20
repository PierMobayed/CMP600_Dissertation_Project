import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";

type OpenSide = null | "left" | "right";
type Layout = "slide" | "sheet";

type Props = {
  className?: string;
  layout?: Layout;
  leftActions: ReactNode;
  rightPanel: ReactNode;
  children: ReactNode;
  onOpenChange?: (side: OpenSide) => void;
  onEditStop?: () => void;
  onNotesSave?: () => void;
  /** When true, closes the Actions / Notes panel (e.g. stop completed). */
  closePanel?: boolean;
};

const SWIPE_THRESHOLD = 48;

export function SwipeStopShell({
  className = "",
  layout = "slide",
  leftActions,
  rightPanel,
  children,
  onOpenChange,
  onEditStop,
  onNotesSave,
  closePanel = false,
}: Props) {
  const [open, setOpen] = useState<OpenSide>(null);
  const [dragDx, setDragDx] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);
  const openRef = useRef<OpenSide>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const swipeMovedRef = useRef(false);
  openRef.current = open;

  const setOpenSide = useCallback(
    (side: OpenSide) => {
      setOpen(side);
      setDragDx(0);
      onOpenChange?.(side);
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (closePanel) setOpenSide(null);
  }, [closePanel, setOpenSide]);

  const resolveSwipe = useCallback(
    (dx: number, dy: number) => {
      if (Math.abs(dy) > Math.abs(dx) * 1.15) return;
      const current = openRef.current;

      if (current === "left") {
        if (dx > 28) setOpenSide(null);
        return;
      }
      if (current === "right") {
        if (dx < -28) setOpenSide(null);
        return;
      }
      if (dx < -SWIPE_THRESHOLD) setOpenSide("left");
      else if (dx > SWIPE_THRESHOLD) setOpenSide("right");
    },
    [setOpenSide],
  );

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, label")) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    tracking.current = true;
    swipeMovedRef.current = false;
    setDragDx(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!tracking.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (Math.abs(dy) > Math.abs(dx) * 1.15) {
      setDragDx(0);
      return;
    }
    if (Math.abs(dx) > 6) swipeMovedRef.current = true;
    setDragDx(dx);
  }

  function endPointer(e: PointerEvent<HTMLDivElement>, commit: boolean) {
    if (!tracking.current) return;
    tracking.current = false;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    setDragDx(0);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (commit) resolveSwipe(dx, dy);
  }

  function onContentClickCapture(e: MouseEvent) {
    if (swipeMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      swipeMovedRef.current = false;
    }
  }

  const mod =
    open === "left" ? "swipe-stop--open-left" : open === "right" ? "swipe-stop--open-right" : "";

  const layoutClass = layout === "sheet" ? "swipe-stop--sheet" : "swipe-stop--slide";
  const view = open === "left" ? "actions" : open === "right" ? "notes" : "main";

  if (layout === "sheet") {
    const sheetMod = view === "notes" ? "swipe-stop--sheet-notes" : "";
    return (
      <div className={`swipe-stop ${layoutClass} ${mod} ${sheetMod} ${className}`.trim()}>
        <div
          className="swipe-sheet-viewport"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endPointer(e, true)}
          onPointerCancel={(e) => endPointer(e, false)}
        >
          {view === "main" && <div className="swipe-sheet-pane">{children}</div>}
          {view === "actions" && (
            <div className="swipe-sheet-pane swipe-sheet-pane--actions">{leftActions}</div>
          )}
          {view === "notes" && (
            <div className="swipe-sheet-pane swipe-sheet-pane--notes">{rightPanel}</div>
          )}
        </div>
        {view === "notes" && onNotesSave && (
          <div className="swipe-sheet-footer">
            <button type="button" className="swipe-chip swipe-chip--save" onClick={onNotesSave}>
              Save note
            </button>
          </div>
        )}
        <nav className="swipe-sheet-tabs" aria-label="Stop panel">
          <button
            type="button"
            className={`swipe-sheet-tab ${view === "main" ? "swipe-sheet-tab--active" : ""}`}
            onClick={() => setOpenSide(null)}
          >
            Stop
          </button>
          <button
            type="button"
            className={`swipe-sheet-tab ${view === "actions" ? "swipe-sheet-tab--active" : ""}`}
            onClick={() => setOpenSide(open === "left" ? null : "left")}
          >
            Actions
          </button>
          <button
            type="button"
            className={`swipe-sheet-tab ${view === "notes" ? "swipe-sheet-tab--active" : ""}`}
            onClick={() => setOpenSide(open === "right" ? null : "right")}
          >
            Notes
          </button>
        </nav>
      </div>
    );
  }

  const shellW = shellRef.current?.offsetWidth ?? 320;
  let translatePct = 0;
  if (open === "left") translatePct = -100;
  else if (open === "right") translatePct = 100;
  if (dragDx !== 0) {
    translatePct += (dragDx / shellW) * 100;
    translatePct = Math.max(-100, Math.min(100, translatePct));
  }

  const dragStyle =
    dragDx !== 0 || open
      ? { transform: `translateX(${translatePct}%)` }
      : undefined;

  return (
    <div
      ref={shellRef}
      className={`swipe-stop ${layoutClass} ${mod} ${className}`.trim()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endPointer(e, true)}
      onPointerCancel={(e) => endPointer(e, false)}
    >
      <div className="swipe-stop-actions swipe-stop-actions--left" aria-hidden={open !== "left"}>
        {leftActions}
      </div>
      <div className="swipe-stop-panel swipe-stop-panel--right" aria-hidden={open !== "right"}>
        {rightPanel}
      </div>
      <div className="swipe-stop-content" style={dragStyle} onClickCapture={onContentClickCapture}>
        {children}
      </div>
      <div className="swipe-stop-controls" role="group" aria-label="Reveal stop actions or notes">
        {open === "left" && (
          <button type="button" className="swipe-chip swipe-chip--back" onClick={() => setOpenSide(null)}>
            ← Back to stop
          </button>
        )}
        {open === "right" && onNotesSave && (
          <>
            <button type="button" className="swipe-chip swipe-chip--save" onClick={onNotesSave}>
              Save note
            </button>
            <button type="button" className="swipe-chip swipe-chip--back" onClick={() => setOpenSide(null)}>
              ← Back to stop
            </button>
          </>
        )}
        {!open && (
          <>
            <button type="button" className="swipe-chip swipe-chip--actions" onClick={() => setOpenSide("left")}>
              Actions
            </button>
            <button type="button" className="swipe-chip swipe-chip--notes" onClick={() => setOpenSide("right")}>
              Notes
            </button>
          </>
        )}
      </div>
    </div>
  );
}
