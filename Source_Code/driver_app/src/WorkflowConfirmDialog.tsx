import { useEffect } from "react";
import { createPortal } from "react-dom";
import { workflowConfirmCopy, type WorkflowConfirmStatus } from "./workflowStatusConfirm";

type Props = {
  status: WorkflowConfirmStatus;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmIcon({ variant }: { variant: "teal" | "done" | "warn" }) {
  const glyph = variant === "warn" ? "!" : variant === "done" ? "✓" : "↗";
  return (
    <span className={`workflow-confirm-icon workflow-confirm-icon--${variant}`} aria-hidden>
      {glyph}
    </span>
  );
}

export function WorkflowConfirmDialog({ status, onConfirm, onCancel }: Props) {
  const copy = workflowConfirmCopy(status);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const dialog = (
    <div
      className="workflow-confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workflow-confirm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="workflow-confirm-sheet">
        <div className="workflow-confirm-handle" aria-hidden />
        <div className="workflow-confirm-head">
          <ConfirmIcon variant={copy.variant} />
          <div className="workflow-confirm-head-text">
            <h2 id="workflow-confirm-title" className="workflow-confirm-title">
              {copy.title}
            </h2>
            <p className="workflow-confirm-message">{copy.message}</p>
          </div>
        </div>
        <div className="workflow-confirm-actions">
          <button type="button" className="workflow-confirm-btn workflow-confirm-btn--cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`workflow-confirm-btn workflow-confirm-btn--${copy.variant}`}
            onClick={onConfirm}
          >
            {copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
