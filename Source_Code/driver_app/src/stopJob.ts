import type { RunStopRow } from "./App";

type FleetShipment = {
  shipmentId: string;
  destination: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  status: string;
  lat: number;
  lng: number;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  parcelCount?: number;
};

export type StopJob = {
  status: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  deliveryOption: string;
  parcelCount: number;
};

export function resolveStopJob(
  shipmentId: string,
  fleetShipments: FleetShipment[] | undefined,
  runStops: RunStopRow[],
): StopJob | null {
  const row = runStops.find((s) => s.shipmentId === shipmentId);
  return resolveStopJobFromRow(row ?? { shipmentId } as RunStopRow, fleetShipments, runStops);
}

export function resolveStopJobFromRow(
  row: Pick<RunStopRow, "shipmentId" | "phase" | "pickupAddress" | "deliveryAddress" | "lat" | "lng" | "status" | "deliveryOption" | "parcelCount" | "destination">,
  fleetShipments: FleetShipment[] | undefined,
  runStops: RunStopRow[],
): StopJob | null {
  const fleetRow = fleetShipments?.find((s) => s.shipmentId === row.shipmentId);
  const legRow = runStops.find((s) => s.shipmentId === row.shipmentId && s.phase === row.phase) ?? runStops.find((s) => s.shipmentId === row.shipmentId);
  if (!fleetRow && !legRow) return null;
  const phase = row.phase ?? legRow?.phase ?? "deliver";
  return {
    status: fleetRow?.status ?? legRow?.status ?? row.status ?? "Assigned",
    pickupAddress: fleetRow?.pickupAddress ?? row.pickupAddress ?? legRow?.pickupAddress ?? "Collection",
    deliveryAddress:
      fleetRow?.deliveryAddress ?? row.deliveryAddress ?? legRow?.deliveryAddress ?? row.destination ?? "",
    pickupLat: fleetRow?.pickupLat ?? (phase === "collect" ? row.lat : undefined) ?? legRow?.lat ?? fleetRow?.lat ?? 0,
    pickupLng: fleetRow?.pickupLng ?? (phase === "collect" ? row.lng : undefined) ?? legRow?.lng ?? fleetRow?.lng ?? 0,
    deliveryLat:
      fleetRow?.deliveryLat ?? (phase === "deliver" ? row.lat : undefined) ?? legRow?.lat ?? fleetRow?.lat ?? 0,
    deliveryLng:
      fleetRow?.deliveryLng ?? (phase === "deliver" ? row.lng : undefined) ?? legRow?.lng ?? fleetRow?.lng ?? 0,
    deliveryOption: row.deliveryOption ?? legRow?.deliveryOption ?? "Standard",
    parcelCount: row.parcelCount ?? legRow?.parcelCount ?? fleetRow?.parcelCount ?? 1,
  };
}
