import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DeliveryOptionMeta } from "../api";
import { type AddressSuggestion, fetchAddressSuggestions } from "../lib/addressSuggest";
import { isDeliveryDateForward, maxDeliveryDate, minForwardDeliveryDate } from "../lib/deliveryDate";
import { formatDisplayDate, tomorrowIso } from "../lib/dates";
import { formatCoord, geocodeAddress } from "../lib/geocode";
import {
  formatFromGbp,
  formatGbp,
  isNextDayOption,
  isSameDayOption,
  priceForOption,
  serviceBadge,
  simulatedPaymentRef,
} from "../lib/pricing";
import { buildFullAddress, formatUkPostcode } from "../lib/ukPostcode";
import { AddressStepForm, type GeoPinState } from "./AddressStepForm";

export type OrderDraft = {
  pickupAddress: string;
  destination: string;
  deliveryOption: string;
  deliveryDate: string;
  pickupLat?: number;
  pickupLng?: number;
  destLat?: number;
  destLng?: number;
};

type Step = "collection" | "delivery" | "service" | "account" | "payment";

const STEPS_DEFAULT: { id: Step; label: string }[] = [
  { id: "collection", label: "Collect" },
  { id: "delivery", label: "Deliver" },
  { id: "service", label: "Service" },
  { id: "payment", label: "Pay" },
];

const STEPS_PUBLIC: { id: Step; label: string }[] = [
  { id: "collection", label: "Collect" },
  { id: "delivery", label: "Deliver" },
  { id: "service", label: "Service" },
  { id: "account", label: "Account" },
  { id: "payment", label: "Pay" },
];

type Props = {
  deliveryOpts: DeliveryOptionMeta[];
  busy: boolean;
  onSubmit: (draft: OrderDraft, paymentRef: string) => Promise<void>;
  publicBooking?: boolean;
  authed?: boolean;
  clientId?: string | null;
  accountPanel?: ReactNode;
};

function parseCoord(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function hasManualCoords(lat: string, lng: string): boolean {
  return parseCoord(lat) !== undefined && parseCoord(lng) !== undefined;
}

function normalizeAddressKey(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

function shouldReuseCoords(
  address: string,
  lat: string,
  lng: string,
  pinAdjusted: boolean,
  resolvedKey: string | null,
): boolean {
  if (!pinAdjusted || !hasManualCoords(lat, lng) || !resolvedKey) return false;
  return normalizeAddressKey(address) === resolvedKey;
}

export function BookParcelFlow({
  deliveryOpts,
  busy,
  onSubmit,
  publicBooking = false,
  authed = true,
  accountPanel,
}: Props) {
  const steps = publicBooking ? STEPS_PUBLIC : STEPS_DEFAULT;
  const [step, setStep] = useState<Step>("collection");

  const [pickupPostcode, setPickupPostcode] = useState("");
  const [pickupLine, setPickupLine] = useState("");
  const [destPostcode, setDestPostcode] = useState("");
  const [destLine, setDestLine] = useState("");

  const [pickupLat, setPickupLat] = useState("");
  const [pickupLng, setPickupLng] = useState("");
  const [destLat, setDestLat] = useState("");
  const [destLng, setDestLng] = useState("");

  const [optionId, setOptionId] = useState("Express");
  const [deliveryDate, setDeliveryDate] = useState(tomorrowIso());
  const minBookDate = minForwardDeliveryDate(null);
  const maxBookDate = maxDeliveryDate();
  const [showAdvancedPickup, setShowAdvancedPickup] = useState(false);
  const [showAdvancedDest, setShowAdvancedDest] = useState(false);

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [paying, setPaying] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const [pickupGeo, setPickupGeo] = useState<GeoPinState>({ status: "idle" });
  const [destGeo, setDestGeo] = useState<GeoPinState>({ status: "idle" });
  const [pickupMapKey, setPickupMapKey] = useState(0);
  const [destMapKey, setDestMapKey] = useState(0);

  const [pickupSuggestions, setPickupSuggestions] = useState<AddressSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<AddressSuggestion[]>([]);
  const [pickupSuggestionsLoading, setPickupSuggestionsLoading] = useState(false);
  const [destSuggestionsLoading, setDestSuggestionsLoading] = useState(false);
  const [pickupSuggestionsOpen, setPickupSuggestionsOpen] = useState(false);
  const [destSuggestionsOpen, setDestSuggestionsOpen] = useState(false);
  const [pickupAreaLabel, setPickupAreaLabel] = useState<string | undefined>();
  const [destAreaLabel, setDestAreaLabel] = useState<string | undefined>();
  const [preciseLookup, setPreciseLookup] = useState(true);

  const pickupGeoTimer = useRef<number | null>(null);
  const destGeoTimer = useRef<number | null>(null);
  const pickupSuggestTimer = useRef<number | null>(null);
  const destSuggestTimer = useRef<number | null>(null);
  const pickupResolvedKey = useRef<string | null>(null);
  const destResolvedKey = useRef<string | null>(null);
  const pickupPinAdjusted = useRef(false);
  const destPinAdjusted = useRef(false);

  const pickupFull = useMemo(
    () => buildFullAddress(pickupLine, pickupPostcode),
    [pickupLine, pickupPostcode],
  );
  const destFull = useMemo(() => buildFullAddress(destLine, destPostcode), [destLine, destPostcode]);

  const options = useMemo(() => {
    if (deliveryOpts.length > 0) return deliveryOpts;
    return [
      { id: "Express", label: "Express (next day)", description: "Next-day delivery." },
      { id: "Standard", label: "Standard road freight", description: "Economy routing." },
    ];
  }, [deliveryOpts]);

  useEffect(() => {
    if (isNextDayOption(optionId) || isSameDayOption(optionId)) {
      setDeliveryDate(isSameDayOption(optionId) ? new Date().toISOString().slice(0, 10) : tomorrowIso());
    }
  }, [optionId]);

  const price = priceForOption(optionId);
  const selectedOpt = options.find((o) => o.id === optionId) ?? options[0];

  const resolvePin = useCallback(
    async (
      address: string,
      lat: string,
      lng: string,
      setLat: (v: string) => void,
      setLng: (v: string) => void,
      setGeo: (s: GeoPinState) => void,
      pinAdjusted: React.MutableRefObject<boolean>,
      resolvedKey: React.MutableRefObject<string | null>,
      bumpMapKey: () => void,
    ): Promise<boolean> => {
      const key = normalizeAddressKey(address);
      if (shouldReuseCoords(address, lat, lng, pinAdjusted.current, resolvedKey.current)) {
        setGeo({
          status: "ok",
          lat: parseCoord(lat)!,
          lng: parseCoord(lng)!,
          displayName: "Pin position on map",
        });
        return true;
      }
      setGeo({ status: "loading" });
      try {
        const hit = await geocodeAddress(address);
        setLat(formatCoord(hit.lat));
        setLng(formatCoord(hit.lng));
        resolvedKey.current = key;
        pinAdjusted.current = false;
        bumpMapKey();
        setGeo({
          status: "ok",
          lat: hit.lat,
          lng: hit.lng,
          displayName: hit.displayName,
          approximate: hit.approximate,
        });
        return true;
      } catch (e2) {
        setGeo({
          status: "error",
          message: e2 instanceof Error ? e2.message : "Address lookup failed",
        });
        return false;
      }
    },
    [],
  );

  const scheduleLookup = useCallback(
    (
      address: string,
      lat: string,
      lng: string,
      setLat: (v: string) => void,
      setLng: (v: string) => void,
      setGeo: (s: GeoPinState) => void,
      timerRef: React.MutableRefObject<number | null>,
      pinAdjusted: React.MutableRefObject<boolean>,
      resolvedKey: React.MutableRefObject<string | null>,
      bumpMapKey: () => void,
    ) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const trimmed = address.trim();
      if (trimmed.length < 5) {
        setGeo({ status: "idle" });
        return;
      }
      if (shouldReuseCoords(address, lat, lng, pinAdjusted.current, resolvedKey.current)) {
        setGeo({
          status: "ok",
          lat: parseCoord(lat)!,
          lng: parseCoord(lng)!,
          displayName: "Pin position on map",
        });
        return;
      }
      timerRef.current = window.setTimeout(() => {
        void resolvePin(address, lat, lng, setLat, setLng, setGeo, pinAdjusted, resolvedKey, bumpMapKey);
      }, 700);
    },
    [resolvePin],
  );

  const loadSuggestions = useCallback(
    async (
      postcode: string,
      query: string,
      setSuggestions: (v: AddressSuggestion[]) => void,
      setAreaLabel: (v: string | undefined) => void,
      setOpen: (v: boolean) => void,
      setLoading: (v: boolean) => void,
    ) => {
      const pc = formatUkPostcode(postcode);
      if (!pc) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetchAddressSuggestions(pc, query);
        setSuggestions(res.suggestions);
        setAreaLabel(res.areaLabel);
        if (res.preciseLookup !== undefined) {
          setPreciseLookup(res.preciseLookup);
        }
        setOpen(res.suggestions.length > 0 || query.trim().length > 0 || Boolean(res.preciseLookup));
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const scheduleSuggest = useCallback(
    (
      postcode: string,
      query: string,
      timerRef: React.MutableRefObject<number | null>,
      setSuggestions: (v: AddressSuggestion[]) => void,
      setAreaLabel: (v: string | undefined) => void,
      setOpen: (v: boolean) => void,
      setLoading: (v: boolean) => void,
    ) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const pc = formatUkPostcode(postcode);
      if (!pc) return;
      timerRef.current = window.setTimeout(() => {
        void loadSuggestions(postcode, query, setSuggestions, setAreaLabel, setOpen, setLoading);
      }, 450);
    },
    [loadSuggestions],
  );

  function resetGeoForAddressChange(
    full: string,
    resolvedKey: React.MutableRefObject<string | null>,
    pinAdjusted: React.MutableRefObject<boolean>,
    setLat: (v: string) => void,
    setLng: (v: string) => void,
    setGeo: (s: GeoPinState) => void,
  ) {
    const nextKey = normalizeAddressKey(full);
    if (resolvedKey.current && nextKey !== resolvedKey.current) {
      setLat("");
      setLng("");
      pinAdjusted.current = false;
      resolvedKey.current = null;
    }
    setGeo({ status: "idle" });
  }

  function applySuggestion(
    item: AddressSuggestion,
    line: string,
    setLine: (v: string) => void,
    setLat: (v: string) => void,
    setLng: (v: string) => void,
    setGeo: (s: GeoPinState) => void,
    resolvedKey: React.MutableRefObject<string | null>,
    pinAdjusted: React.MutableRefObject<boolean>,
    bumpMapKey: () => void,
    fullAddress: string,
    setOpen: (v: boolean) => void,
  ) {
    setLine(item.line1 || line);
    setLat(formatCoord(item.lat));
    setLng(formatCoord(item.lng));
    resolvedKey.current = normalizeAddressKey(fullAddress);
    pinAdjusted.current = false;
    bumpMapKey();
    setGeo({
      status: "ok",
      lat: item.lat,
      lng: item.lng,
      displayName: item.label,
    });
    setOpen(false);
  }

  function buildDraft(): OrderDraft {
    const draft: OrderDraft = {
      pickupAddress: pickupFull.trim(),
      destination: destFull.trim(),
      deliveryOption: optionId,
      deliveryDate,
    };
    const plat = parseCoord(pickupLat);
    const plng = parseCoord(pickupLng);
    const dlat = parseCoord(destLat);
    const dlng = parseCoord(destLng);
    if (plat !== undefined) draft.pickupLat = plat;
    if (plng !== undefined) draft.pickupLng = plng;
    if (dlat !== undefined) draft.destLat = dlat;
    if (dlng !== undefined) draft.destLng = dlng;
    return draft;
  }

  async function goNext() {
    setLocalErr(null);
    if (step === "collection") {
      if (!formatUkPostcode(pickupPostcode)) {
        setLocalErr("Enter a valid UK postcode for collection.");
        return;
      }
      setGeocoding(true);
      const ok = await resolvePin(
        pickupFull,
        pickupLat,
        pickupLng,
        setPickupLat,
        setPickupLng,
        setPickupGeo,
        pickupPinAdjusted,
        pickupResolvedKey,
        () => setPickupMapKey((k) => k + 1),
      );
      setGeocoding(false);
      if (!ok) {
        setLocalErr("We could not place the collection address on the map. Pick from the list or adjust the pin.");
        setShowAdvancedPickup(true);
        return;
      }
      setStep("delivery");
      return;
    }
    if (step === "delivery") {
      if (!formatUkPostcode(destPostcode)) {
        setLocalErr("Enter a valid UK postcode for delivery.");
        return;
      }
      setGeocoding(true);
      const ok = await resolvePin(
        destFull,
        destLat,
        destLng,
        setDestLat,
        setDestLng,
        setDestGeo,
        destPinAdjusted,
        destResolvedKey,
        () => setDestMapKey((k) => k + 1),
      );
      setGeocoding(false);
      if (!ok) {
        setLocalErr("We could not place the delivery address on the map. Pick from the list or adjust the pin.");
        setShowAdvancedDest(true);
        return;
      }
      setStep("service");
      return;
    }
    if (step === "service") {
      if (!isDeliveryDateForward(null, deliveryDate)) {
        setLocalErr(`Delivery date must be between ${minBookDate} and ${maxBookDate}.`);
        return;
      }
      setStep(publicBooking ? "account" : "payment");
      return;
    }
    if (step === "account") {
      if (!authed) {
        setLocalErr("Log in or register above to continue to payment.");
        return;
      }
      setStep("payment");
    }
  }

  function goBack() {
    setLocalErr(null);
    if (step === "delivery") setStep("collection");
    else if (step === "service") setStep("delivery");
    else if (step === "account") setStep("service");
    else if (step === "payment") setStep(publicBooking ? "account" : "service");
  }

  function fillDemoPayment() {
    setCardName("Demo Customer");
    setCardNumber("4242 4242 4242 4242");
    setCardExpiry("12/28");
    setCardCvc("123");
    setLocalErr(null);
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr(null);
    if (!isDeliveryDateForward(null, deliveryDate)) {
      setLocalErr(`Delivery date must be between ${minBookDate} and ${maxBookDate}.`);
      return;
    }
    if (!cardName.trim() || cardNumber.replace(/\s/g, "").length < 12) {
      setLocalErr("Enter cardholder name and a valid card number (simulated).");
      return;
    }
    setPaying(true);
    const payRef = simulatedPaymentRef();
    await new Promise((r) => setTimeout(r, 1400));
    try {
      await onSubmit(buildDraft(), payRef);
    } catch (e2) {
      setLocalErr(e2 instanceof Error ? e2.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  const stepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="book-flow">
      <ol className="book-steps" aria-label="Booking progress">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className={
              i < stepIndex
                ? "book-step book-step--done"
                : i === stepIndex
                  ? "book-step book-step--active"
                  : "book-step"
            }
          >
            <span className="book-step-num">{i + 1}</span>
            <span className="book-step-label">{s.label}</span>
          </li>
        ))}
      </ol>

      {localErr && <p className="client-alert client-alert--error">{localErr}</p>}

      {step === "collection" && (
        <>
          <AddressStepForm
            title="Collection address"
            lead="Enter your postcode, then choose or type the house number or building name. Drag the pin on the map for precision."
            variant="collection"
            mapLabel="Collection address"
            postcode={pickupPostcode}
            line={pickupLine}
            onPostcodeChange={(v) => {
              setPickupPostcode(v);
              resetGeoForAddressChange(
                buildFullAddress(pickupLine, v),
                pickupResolvedKey,
                pickupPinAdjusted,
                setPickupLat,
                setPickupLng,
                setPickupGeo,
              );
              setPickupSuggestionsOpen(false);
            }}
            onLineChange={(v) => {
              setPickupLine(v);
              resetGeoForAddressChange(
                buildFullAddress(v, pickupPostcode),
                pickupResolvedKey,
                pickupPinAdjusted,
                setPickupLat,
                setPickupLng,
                setPickupGeo,
              );
              scheduleSuggest(
                pickupPostcode,
                v,
                pickupSuggestTimer,
                setPickupSuggestions,
                setPickupAreaLabel,
                setPickupSuggestionsOpen,
                setPickupSuggestionsLoading,
              );
            }}
            onPostcodeBlur={() => {
              void loadSuggestions(
                pickupPostcode,
                "",
                setPickupSuggestions,
                setPickupAreaLabel,
                setPickupSuggestionsOpen,
                setPickupSuggestionsLoading,
              );
              scheduleLookup(
                pickupFull,
                pickupLat,
                pickupLng,
                setPickupLat,
                setPickupLng,
                setPickupGeo,
                pickupGeoTimer,
                pickupPinAdjusted,
                pickupResolvedKey,
                () => setPickupMapKey((k) => k + 1),
              );
            }}
            onLineFocus={() => {
              if (!formatUkPostcode(pickupPostcode)) return;
              void loadSuggestions(
                pickupPostcode,
                pickupLine,
                setPickupSuggestions,
                setPickupAreaLabel,
                setPickupSuggestionsOpen,
                setPickupSuggestionsLoading,
              );
            }}
            onLineBlur={() => {
              scheduleSuggest(
                pickupPostcode,
                pickupLine,
                pickupSuggestTimer,
                setPickupSuggestions,
                setPickupAreaLabel,
                setPickupSuggestionsOpen,
                setPickupSuggestionsLoading,
              );
              scheduleLookup(
                pickupFull,
                pickupLat,
                pickupLng,
                setPickupLat,
                setPickupLng,
                setPickupGeo,
                pickupGeoTimer,
                pickupPinAdjusted,
                pickupResolvedKey,
                () => setPickupMapKey((k) => k + 1),
              );
            }}
            preciseLookup={preciseLookup}
            suggestions={pickupSuggestions}
            suggestionsLoading={pickupSuggestionsLoading}
            suggestionsOpen={pickupSuggestionsOpen}
            areaLabel={pickupAreaLabel}
            onPickSuggestion={(item) =>
              applySuggestion(
                item,
                pickupLine,
                setPickupLine,
                setPickupLat,
                setPickupLng,
                setPickupGeo,
                pickupResolvedKey,
                pickupPinAdjusted,
                () => setPickupMapKey((k) => k + 1),
                buildFullAddress(item.line1, pickupPostcode),
                setPickupSuggestionsOpen,
              )
            }
            geo={pickupGeo}
            mapKey={pickupMapKey}
            recenterKey={pickupMapKey}
            onPinMove={(lat, lng) => {
              pickupPinAdjusted.current = true;
              if (pickupResolvedKey.current === null) {
                pickupResolvedKey.current = normalizeAddressKey(pickupFull);
              }
              setPickupLat(formatCoord(lat));
              setPickupLng(formatCoord(lng));
              setPickupGeo((prev) => ({
                status: "ok",
                lat,
                lng,
                displayName: prev.status === "ok" ? prev.displayName : "Pin position on map",
              }));
            }}
            showAdvanced={showAdvancedPickup}
            onToggleAdvanced={() => setShowAdvancedPickup((v) => !v)}
            lat={pickupLat}
            lng={pickupLng}
            onLatChange={(v) => {
              setPickupLat(v);
              if (hasManualCoords(v, pickupLng)) {
                pickupPinAdjusted.current = true;
                pickupResolvedKey.current = normalizeAddressKey(pickupFull);
                setPickupMapKey((k) => k + 1);
                setPickupGeo({
                  status: "ok",
                  lat: parseCoord(v)!,
                  lng: parseCoord(pickupLng)!,
                  displayName: "Coordinates entered manually",
                });
              }
            }}
            onLngChange={(v) => {
              setPickupLng(v);
              if (hasManualCoords(pickupLat, v)) {
                pickupPinAdjusted.current = true;
                pickupResolvedKey.current = normalizeAddressKey(pickupFull);
                setPickupMapKey((k) => k + 1);
                setPickupGeo({
                  status: "ok",
                  lat: parseCoord(pickupLat)!,
                  lng: parseCoord(v)!,
                  displayName: "Coordinates entered manually",
                });
              }
            }}
          />
          <div className="book-actions">
            <button
              type="button"
              className="client-btn client-btn--primary"
              onClick={() => void goNext()}
              disabled={geocoding}
            >
              {geocoding ? "Checking collection…" : "Continue to delivery"}
            </button>
          </div>
        </>
      )}

      {step === "delivery" && (
        <>
          <AddressStepForm
            title="Delivery address"
            lead="Enter the delivery postcode and building details. Drag the pin to mark the exact drop-off point."
            variant="delivery"
            mapLabel="Delivery address"
            postcode={destPostcode}
            line={destLine}
            onPostcodeChange={(v) => {
              setDestPostcode(v);
              resetGeoForAddressChange(
                buildFullAddress(destLine, v),
                destResolvedKey,
                destPinAdjusted,
                setDestLat,
                setDestLng,
                setDestGeo,
              );
              setDestSuggestionsOpen(false);
            }}
            onLineChange={(v) => {
              setDestLine(v);
              resetGeoForAddressChange(
                buildFullAddress(v, destPostcode),
                destResolvedKey,
                destPinAdjusted,
                setDestLat,
                setDestLng,
                setDestGeo,
              );
              scheduleSuggest(
                destPostcode,
                v,
                destSuggestTimer,
                setDestSuggestions,
                setDestAreaLabel,
                setDestSuggestionsOpen,
                setDestSuggestionsLoading,
              );
            }}
            onPostcodeBlur={() => {
              void loadSuggestions(
                destPostcode,
                "",
                setDestSuggestions,
                setDestAreaLabel,
                setDestSuggestionsOpen,
                setDestSuggestionsLoading,
              );
              scheduleLookup(
                destFull,
                destLat,
                destLng,
                setDestLat,
                setDestLng,
                setDestGeo,
                destGeoTimer,
                destPinAdjusted,
                destResolvedKey,
                () => setDestMapKey((k) => k + 1),
              );
            }}
            onLineFocus={() => {
              if (!formatUkPostcode(destPostcode)) return;
              void loadSuggestions(
                destPostcode,
                destLine,
                setDestSuggestions,
                setDestAreaLabel,
                setDestSuggestionsOpen,
                setDestSuggestionsLoading,
              );
            }}
            onLineBlur={() => {
              scheduleSuggest(
                destPostcode,
                destLine,
                destSuggestTimer,
                setDestSuggestions,
                setDestAreaLabel,
                setDestSuggestionsOpen,
                setDestSuggestionsLoading,
              );
              scheduleLookup(
                destFull,
                destLat,
                destLng,
                setDestLat,
                setDestLng,
                setDestGeo,
                destGeoTimer,
                destPinAdjusted,
                destResolvedKey,
                () => setDestMapKey((k) => k + 1),
              );
            }}
            preciseLookup={preciseLookup}
            suggestions={destSuggestions}
            suggestionsLoading={destSuggestionsLoading}
            suggestionsOpen={destSuggestionsOpen}
            areaLabel={destAreaLabel}
            onPickSuggestion={(item) =>
              applySuggestion(
                item,
                destLine,
                setDestLine,
                setDestLat,
                setDestLng,
                setDestGeo,
                destResolvedKey,
                destPinAdjusted,
                () => setDestMapKey((k) => k + 1),
                buildFullAddress(item.line1, destPostcode),
                setDestSuggestionsOpen,
              )
            }
            geo={destGeo}
            mapKey={destMapKey}
            recenterKey={destMapKey}
            onPinMove={(lat, lng) => {
              destPinAdjusted.current = true;
              if (destResolvedKey.current === null) {
                destResolvedKey.current = normalizeAddressKey(destFull);
              }
              setDestLat(formatCoord(lat));
              setDestLng(formatCoord(lng));
              setDestGeo((prev) => ({
                status: "ok",
                lat,
                lng,
                displayName: prev.status === "ok" ? prev.displayName : "Pin position on map",
              }));
            }}
            showAdvanced={showAdvancedDest}
            onToggleAdvanced={() => setShowAdvancedDest((v) => !v)}
            lat={destLat}
            lng={destLng}
            onLatChange={(v) => {
              setDestLat(v);
              if (hasManualCoords(v, destLng)) {
                destPinAdjusted.current = true;
                destResolvedKey.current = normalizeAddressKey(destFull);
                setDestMapKey((k) => k + 1);
                setDestGeo({
                  status: "ok",
                  lat: parseCoord(v)!,
                  lng: parseCoord(destLng)!,
                  displayName: "Coordinates entered manually",
                });
              }
            }}
            onLngChange={(v) => {
              setDestLng(v);
              if (hasManualCoords(destLat, v)) {
                destPinAdjusted.current = true;
                destResolvedKey.current = normalizeAddressKey(destFull);
                setDestMapKey((k) => k + 1);
                setDestGeo({
                  status: "ok",
                  lat: parseCoord(destLat)!,
                  lng: parseCoord(v)!,
                  displayName: "Coordinates entered manually",
                });
              }
            }}
          />
          <div className="book-actions book-actions--split">
            <button type="button" className="client-btn client-btn--ghost" onClick={goBack}>
              Back
            </button>
            <button
              type="button"
              className="client-btn client-btn--primary"
              onClick={() => void goNext()}
              disabled={geocoding}
            >
              {geocoding ? "Checking delivery…" : "Continue to service"}
            </button>
          </div>
        </>
      )}

      {step === "service" && (
        <div className="book-panel">
          <h2 className="book-panel-title">Choose a delivery service</h2>
          <p className="book-panel-lead">
            Select a service level — prices shown are simulated for the CMP600 prototype.
          </p>
          <ul className="service-grid">
            {options.map((o) => {
              const badge = serviceBadge(o);
              const selected = o.id === optionId;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    className={
                      selected
                        ? "service-card service-card--selected"
                        : o.id === "Express"
                          ? "service-card service-card--featured"
                          : "service-card"
                    }
                    onClick={() => setOptionId(o.id)}
                  >
                    {badge && <span className="service-card-badge">{badge}</span>}
                    <span className="service-card-name">{o.label}</span>
                    <span className="service-card-desc">{o.description}</span>
                    <span className="service-card-from">{formatFromGbp(priceForOption(o.id))}</span>
                    <span className="service-card-price">{formatGbp(priceForOption(o.id))}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <label className="client-field">
            <span className="client-field-label">Requested delivery date</span>
            <input
              type="date"
              value={deliveryDate}
              min={minBookDate}
              max={maxBookDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
            <span className="client-field-hint">Delivery date: today through {maxBookDate} (30 days ahead).</span>
            {isNextDayOption(optionId) && (
              <span className="client-field-hint">Express targets {formatDisplayDate(deliveryDate)} (next day).</span>
            )}
          </label>
          <div className="book-actions book-actions--split">
            <button type="button" className="client-btn client-btn--ghost" onClick={goBack}>
              Back
            </button>
            <button type="button" className="client-btn client-btn--primary" onClick={goNext}>
              {publicBooking ? "Continue to account" : "Continue to payment"}
            </button>
          </div>
        </div>
      )}

      {step === "account" && publicBooking && (
        <div className="book-panel book-panel--account">
          <h2 className="book-panel-title">Your account</h2>
          {accountPanel}
          {localErr && <p className="client-alert client-alert--error">{localErr}</p>}
          <div className="book-actions book-actions--split">
            <button type="button" className="client-btn client-btn--ghost" onClick={goBack}>
              Back
            </button>
            <button
              type="button"
              className="client-btn client-btn--primary"
              onClick={goNext}
              disabled={!authed}
            >
              Continue to payment
            </button>
          </div>
        </div>
      )}

      {step === "payment" && (
        <div className="book-panel book-panel--pay">
          <h2 className="book-panel-title">Simulated payment</h2>
          <p className="book-panel-lead">No real charge — prototype only for CMP600.</p>
          <div className="pay-summary">
            <div className="pay-summary-row">
              <span>Collection</span>
              <strong>{pickupFull || "—"}</strong>
            </div>
            <div className="pay-summary-row">
              <span>Delivery</span>
              <strong>{destFull || "—"}</strong>
            </div>
            <div className="pay-summary-row">
              <span>Service</span>
              <strong>{selectedOpt?.label ?? optionId}</strong>
            </div>
            <div className="pay-summary-row">
              <span>Delivery date</span>
              <strong>{formatDisplayDate(deliveryDate)}</strong>
            </div>
            <div className="pay-summary-row pay-summary-row--total">
              <span>Total</span>
              <strong>{formatGbp(price)}</strong>
            </div>
          </div>
          <button
            type="button"
            className="client-link-btn pay-demo-fill"
            onClick={fillDemoPayment}
            disabled={paying || busy}
          >
            Fill demo card details
          </button>
          <form className="pay-form" onSubmit={handlePay}>
            <label className="client-field">
              <span className="client-field-label">Name on card</span>
              <input
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="A. Customer"
                autoComplete="cc-name"
                required
              />
            </label>
            <label className="client-field">
              <span className="client-field-label">Card number</span>
              <input
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/[^\d\s]/g, ""))}
                placeholder="4242 4242 4242 4242"
                inputMode="numeric"
                autoComplete="cc-number"
                required
              />
            </label>
            <div className="coord-row">
              <label className="client-field">
                <span className="client-field-label">Expiry</span>
                <input
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  placeholder="MM/YY"
                  autoComplete="cc-exp"
                />
              </label>
              <label className="client-field">
                <span className="client-field-label">CVC</span>
                <input
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  placeholder="123"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                />
              </label>
            </div>
            <div className="book-actions book-actions--split">
              <button type="button" className="client-btn client-btn--ghost" onClick={goBack} disabled={paying || busy}>
                Back
              </button>
              <button type="submit" className="client-btn client-btn--primary" disabled={paying || busy}>
                {paying ? "Processing…" : `Pay ${formatGbp(price)}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
