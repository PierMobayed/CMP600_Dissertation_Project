/** Orders the client may still correct online (before collection is underway). */
export function isOrderEditable(status: string): boolean {
  return status === "Created" || status === "Assigned";
}

type ManageFlags = {
  status: string;
  canEdit?: boolean;
  canHold?: boolean;
  canCancel?: boolean;
  canReleaseHold?: boolean;
};

/** Open edit panel for address/date changes, hold, release, or cancel. */
export function canManageOrder(order: ManageFlags): boolean {
  if (order.canEdit ?? isOrderEditable(order.status)) return true;
  if (order.canHold || order.canCancel || order.canReleaseHold) return true;
  return order.status === "On Hold";
}
