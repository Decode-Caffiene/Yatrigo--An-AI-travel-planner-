"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { searchAirports } from "@/lib/api";
import { airlineLogoUrl, searchAirlines } from "@/lib/airlines";
import { AirlineLogo } from "@/components/AirlineLogo";
import type { AirportSuggestion } from "@/types";

export interface FlightFormValues {
  airline: string;
  airlineCode: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  confirmationNumber: string;
}

const inputClass =
  "w-full rounded-lg border border-surface-variant bg-surface-container-lowest px-3.5 py-2.5 font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const labelClass =
  "mb-1.5 flex items-center gap-1.5 font-body-sm text-body-sm font-medium text-on-surface-variant";

const dropdownClass =
  "absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-surface-variant bg-surface-container-lowest shadow-lg";

const optionClass =
  "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left font-body-md text-body-md text-on-surface transition-colors hover:bg-primary/10";

/** Debounced airport typeahead against the backend's airport dataset. */
function useAirportSuggestions(query: string, enabled: boolean) {
  const { token } = useAuth();
  const [results, setResults] = useState<AirportSuggestion[]>([]);

  useEffect(() => {
    const q = query.trim();

    if (!token || !enabled || q.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchAirports(token, q)
        .then((res) => setResults(res.airports))
        .catch(() => setResults([]));
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [token, query, enabled]);

  return results;
}

function AirportField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (iata: string) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const suggestions = useAirportSuggestions(value, isFocused);

  return (
    <div className="relative">
      <label className={labelClass}>{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={inputClass}
      />
      {isFocused && suggestions.length > 0 && (
        <ul className={dropdownClass}>
          {suggestions.map((airport) => (
            <li key={`${airport.iata}-${airport.name}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  // Keep the input from blurring before the click lands.
                  e.preventDefault();
                  onChange(airport.iata);
                  setIsFocused(false);
                }}
                className={optionClass}
              >
                <span className="w-10 shrink-0 font-label-caps text-label-caps text-primary">
                  {airport.iata}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {airport.city ? `${airport.city} — ` : ""}
                  {airport.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Manual flight entry with autocomplete. Airline options come from a local
 * list so the dropdown (and its real logo) appears from the first keystroke;
 * airports are looked up on the backend, whose dataset is far too large to
 * ship to the browser.
 */
export function FlightFields({
  value,
  onChange,
}: {
  value: FlightFormValues;
  onChange: (next: FlightFormValues) => void;
}) {
  const [isAirlineFocused, setIsAirlineFocused] = useState(false);
  const airlineBoxRef = useRef<HTMLDivElement>(null);

  const set = (patch: Partial<FlightFormValues>) => onChange({ ...value, ...patch });

  const airlineMatches = useMemo(
    () => (isAirlineFocused ? searchAirlines(value.airline) : []),
    [value.airline, isAirlineFocused]
  );

  const logo = airlineLogoUrl(value.airlineCode);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="relative" ref={airlineBoxRef}>
          <label className={labelClass}>Airline</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Qatar Airways"
              autoComplete="off"
              value={value.airline}
              onChange={(e) => set({ airline: e.target.value })}
              onFocus={() => setIsAirlineFocused(true)}
              onBlur={() => setIsAirlineFocused(false)}
              className={`${inputClass} ${logo ? "pl-11" : ""}`}
            />
            {logo && (
              <AirlineLogo
                code={value.airlineCode}
                alt={value.airline || value.airlineCode}
                size={24}
                className="pointer-events-none absolute top-1/2 left-3 h-6 w-6 -translate-y-1/2 rounded object-contain"
              />
            )}
          </div>

          {isAirlineFocused && airlineMatches.length > 0 && (
            <ul className={dropdownClass}>
              {airlineMatches.map((airline) => {
                return (
                  <li key={airline.code}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        set({ airline: airline.name, airlineCode: airline.code });
                        setIsAirlineFocused(false);
                      }}
                      className={optionClass}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                        <AirlineLogo
                          code={airline.code}
                          alt={airline.name}
                          size={24}
                          className="h-6 w-6 rounded object-contain"
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {airline.name}
                        {airline.country && (
                          <span className="ml-1.5 font-body-sm text-body-sm text-on-surface-variant">
                            {airline.country}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 font-label-caps text-label-caps text-on-surface-variant">
                        {airline.code}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <label className={labelClass}>Flight number</label>
          <input
            type="text"
            placeholder="QR648"
            value={value.flightNumber}
            onChange={(e) => set({ flightNumber: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AirportField
          label="Departure airport"
          placeholder="KTM or Kathmandu"
          value={value.departureAirport}
          onChange={(departureAirport) => set({ departureAirport })}
        />
        <AirportField
          label="Arrival airport"
          placeholder="DXB or Dubai"
          value={value.arrivalAirport}
          onChange={(arrivalAirport) => set({ arrivalAirport })}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Departure time</label>
          <input
            type="datetime-local"
            value={value.departureTime}
            onChange={(e) => set({ departureTime: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Arrival time</label>
          <input
            type="datetime-local"
            value={value.arrivalTime}
            onChange={(e) => set({ arrivalTime: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Confirmation number</label>
        <input
          type="text"
          value={value.confirmationNumber}
          onChange={(e) => set({ confirmationNumber: e.target.value })}
          className={inputClass}
        />
      </div>
    </div>
  );
}
