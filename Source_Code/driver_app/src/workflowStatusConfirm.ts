export type WorkflowConfirmStatus = "Picked Up" | "Delivered" | "Delayed";

export function needsWorkflowConfirm(status: string): status is WorkflowConfirmStatus {
  return status === "Picked Up" || status === "Delivered" || status === "Delayed";
}

export function workflowConfirmCopy(status: WorkflowConfirmStatus): {
  title: string;
  message: string;
  confirmLabel: string;
  variant: "teal" | "done" | "warn";
} {
  switch (status) {
    case "Picked Up":
      return {
        title: "Confirm collected?",
        message: "Mark this parcel as collected and loaded on your van. You can start the delivery run next.",
        confirmLabel: "Confirm",
        variant: "teal",
      };
    case "Delivered":
      return {
        title: "Confirm delivered?",
        message: "Mark this parcel as handed to the recipient. This stop will be completed.",
        confirmLabel: "Confirm",
        variant: "done",
      };
    case "Delayed":
      return {
        title: "Report delay?",
        message: "Mark this job as failed or delayed. You can resume the workflow later from Actions or Edit stop.",
        confirmLabel: "Report",
        variant: "warn",
      };
  }
}
