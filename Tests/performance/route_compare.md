# Route planner comparison (dissertation evaluation)

**Date:** May 2026  
**Artefact:** `driver_app/src/doorToDoorRoute.ts`  
**Distance model:** Haversine miles (straight-line; not OSRM road network).

## Policies compared

| Policy | Description | Function |
|--------|-------------|----------|
| **Door-to-door chain** | Phase 0: nearest pending deliveries from start; Phase 1: nearest pickup → deliver pairs | `buildDoorToDoorPlan` → `totalMiles` |
| **Batch pickup tour** | All assigned pickups from start, then all pending deliveries | `compareBatchPickupTourMiles` |

## How to capture numbers

1. Reset seed: from `Source_Code/backend/`, run `python -m app.seed` (20 shipments).
2. Log in as `driver1` / `demo` in the driver app.
3. Tap **Optimise** — the nav toast shows both totals, e.g.  
   `Door-to-door route · 42.3 mi, 28 legs. Batch-pickup baseline ~51.1 mi (~8.8 mi shorter)`.

## Example table (fill after a run)

| Run | Stops on van | Door-to-door (mi) | Batch pickup (mi) | Δ (mi) | Legs |
|-----|--------------|-------------------|-------------------|--------|------|
| Seed 20 | 20 | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

## Notes for Chapter 6

- Greedy nearest-neighbour is **explainable** but not globally optimal.
- Batch hub model is a **contrast** (rejected for door-to-door courier practice).
- Road distances (OSRM) and PD-VRP are **future work** (Sprint R4).
