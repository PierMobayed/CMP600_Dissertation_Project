# CMP600 Demo Video — English Voice-Over Script

**Target length:** 3–5 minutes (~550 words at a calm pace)  
**Output file:** `Viva/demo_video.mp4`  
**Before recording:** run `server-control.bat` → **[1] Start all**

| App | URL | Login |
|-----|-----|--------|
| Office dashboard | http://127.0.0.1:5173/ | `admin` / `demo` |
| Client | http://127.0.0.1:5174/ | `client1` / `demo` (or book without account) |
| Driver | http://127.0.0.1:5175/ | `driver1` / `demo` |

---

## Recording tips

- Speak in **UK academic English** — clear, not rushed (~130 words/min).
- Use one microphone; reduce keyboard clicks; close notifications.
- Record **1920×1080** if possible; zoom browser to 100–110%.
- Do actions **slightly before** you say them so voice and screen stay in sync.
- Say once at the start or end: *“All data in this prototype is simulated for the dissertation demo.”*

---

## Script (voice + on-screen actions)

### 0:00 — Introduction (show three landing pages)

**ON SCREEN:** Three browser tabs — Dashboard (5173), Client (5174), Driver (5175). Briefly scroll each landing page (hero left, steps right).

**VOICE:**

> Hello. This is my CMP600 dissertation prototype for Door2Door — a simulated London door-to-door logistics system.  
> The solution has three web applications and one API: a **client app** for booking and tracking, an **office dashboard** for dispatch and live visibility, and a **driver app** for the daily route.  
> All locations, GPS updates, and payments are **simulated** — this is a research prototype, not a production service.

---

### 0:35 — Client: book a parcel

**ON SCREEN:** Client app → **Book a parcel** → complete the five steps (Collect → Deliver → Service → Account → Pay). Use a simple London-style address if prompted. Complete simulated checkout. Open tracking if available.

**VOICE:**

> I will walk through one end-to-end journey.  
> On the **client app**, a sender books a parcel in five steps: collection address, delivery address, service level, account, and payment.  
> The flow is designed for clarity on mobile and desktop — the office does not need to re-enter this data.  
> After booking, the client can **track** the shipment on a live map with an estimated time of arrival.

---

### 1:35 — Dashboard: sign in and assign driver

**ON SCREEN:** Dashboard → **Sign in to dashboard** → `admin` / `demo` → Overview (KPIs) → Dispatch table → find the new shipment → **assign** to `driver1` (or available driver) → show map with markers updating if possible.

**VOICE:**

> Dispatchers use the **operations dashboard**.  
> After sign-in, they see KPIs — totals for in transit, delivered, and delayed — and a **live map** with drivers and shipments.  
> From the dispatch list, the office **assigns a driver** to the new job and can set delivery expectations.  
> This central view is the control point for the prototype: one map, one table, simulated refresh for the Viva demo.

---

### 2:35 — Driver: run the route

**ON SCREEN:** Driver app → **Sign in to driver app** → `driver1` / `demo` → map + queue → open navigation link if shown → mark **picked up** → then **delivered** (or in transit as your UI allows).

**VOICE:**

> The **driver app** shows today’s run as numbered stops on the map and in a queue — collect before deliver, following door-to-door routing rules.  
> The driver can open **external navigation** for each leg and update status at each stop.  
> Position updates are sent to the API so the office map reflects movement — again, **simulated GPS** for demonstration.

---

### 3:25 — Close the loop + ethics

**ON SCREEN:** Switch back to **dashboard map** (driver marker / shipment status) → optionally client tracking → end on dashboard or three-tab overview.

**VOICE:**

> Returning to the dashboard, we can confirm the shipment progressed through the workflow the office assigned.  
> The client tracking view stays consistent with backend status.  
> In summary, this MVP demonstrates **integrated roles** — book, dispatch, deliver, and monitor — on a shared API with themed React front ends and FastAPI on the server.  
> Security and payments are demo-only; real deployment would need production authentication, privacy review, and live telematics.  
> Thank you for watching.

---

## Optional shorter ending (if you are over 5 minutes)

Cut from *“Returning to the dashboard…”* and use only:

> The dashboard confirms the same status the driver reported. This prototype proves the three apps share one simulated workflow. Thank you.

---

## Checklist before you upload

- [ ] API + three Vite apps running (`server-control.bat` [1])
- [ ] One new booking visible on dashboard dispatch list
- [ ] Driver assignment and at least one status change on driver app
- [ ] Map visible on dashboard (and client tracking if time allows)
- [ ] Spoken disclaimer: simulated data / demo accounts
- [ ] File saved as `Viva/demo_video.mp4`
- [ ] Audio levels OK; no passwords spoken beyond “demo account”

---

## Word count

Main script (voice blocks only): ~**540 words** → about **4 minutes** at 135 wpm.
