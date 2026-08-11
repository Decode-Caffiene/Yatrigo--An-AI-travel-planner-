// Real airline logos by 2-letter IATA code, via Kiwi.com's public image CDN
// (no API key required). Returns null when no code is given so callers can
// skip rendering an image rather than showing a broken one.
export function airlineLogoUrl(code?: string | null): string | null {
  const trimmed = code?.trim().toUpperCase();
  if (!trimmed || trimmed.length !== 2) return null;

  return `https://images.kiwi.com/airlines/64/${trimmed}.png`;
}

export interface Airline {
  name: string;
  code: string;
}

// Major scheduled carriers by IATA code, roughly ordered by how likely a
// traveler is to be flying them, so a short prefix surfaces the big names
// first. Kept client-side (it's a few KB) so the dropdown is instant from
// the very first keystroke, same as the destination field.
const AIRLINES: Airline[] = [
  { name: "Qatar Airways", code: "QR" },
  { name: "Emirates", code: "EK" },
  { name: "Singapore Airlines", code: "SQ" },
  { name: "Turkish Airlines", code: "TK" },
  { name: "Lufthansa", code: "LH" },
  { name: "British Airways", code: "BA" },
  { name: "Air France", code: "AF" },
  { name: "KLM Royal Dutch Airlines", code: "KL" },
  { name: "Etihad Airways", code: "EY" },
  { name: "Cathay Pacific", code: "CX" },
  { name: "Japan Airlines", code: "JL" },
  { name: "All Nippon Airways", code: "NH" },
  { name: "Korean Air", code: "KE" },
  { name: "Thai Airways International", code: "TG" },
  { name: "Malaysia Airlines", code: "MH" },
  { name: "Cathay Dragon", code: "KA" },
  { name: "Air India", code: "AI" },
  { name: "IndiGo", code: "6E" },
  { name: "Vistara", code: "UK" },
  { name: "SpiceJet", code: "SG" },
  { name: "Nepal Airlines", code: "RA" },
  { name: "Buddha Air", code: "U4" },
  { name: "Yeti Airlines", code: "YT" },
  { name: "Himalaya Airlines", code: "H9" },
  { name: "American Airlines", code: "AA" },
  { name: "Delta Air Lines", code: "DL" },
  { name: "United Airlines", code: "UA" },
  { name: "Southwest Airlines", code: "WN" },
  { name: "Alaska Airlines", code: "AS" },
  { name: "JetBlue Airways", code: "B6" },
  { name: "Spirit Airlines", code: "NK" },
  { name: "Frontier Airlines", code: "F9" },
  { name: "Air Canada", code: "AC" },
  { name: "WestJet", code: "WS" },
  { name: "Aeromexico", code: "AM" },
  { name: "Copa Airlines", code: "CM" },
  { name: "LATAM Airlines", code: "LA" },
  { name: "Avianca", code: "AV" },
  { name: "Gol Linhas Aereas", code: "G3" },
  { name: "Azul Brazilian Airlines", code: "AD" },
  { name: "Aerolineas Argentinas", code: "AR" },
  { name: "Iberia", code: "IB" },
  { name: "Vueling", code: "VY" },
  { name: "Ryanair", code: "FR" },
  { name: "easyJet", code: "U2" },
  { name: "Wizz Air", code: "W6" },
  { name: "TAP Air Portugal", code: "TP" },
  { name: "ITA Airways", code: "AZ" },
  { name: "Swiss International Air Lines", code: "LX" },
  { name: "Austrian Airlines", code: "OS" },
  { name: "Brussels Airlines", code: "SN" },
  { name: "Scandinavian Airlines", code: "SK" },
  { name: "Finnair", code: "AY" },
  { name: "Norwegian Air Shuttle", code: "DY" },
  { name: "Icelandair", code: "FI" },
  { name: "Aer Lingus", code: "EI" },
  { name: "LOT Polish Airlines", code: "LO" },
  { name: "Czech Airlines", code: "OK" },
  { name: "Aegean Airlines", code: "A3" },
  { name: "Air Serbia", code: "JU" },
  { name: "Croatia Airlines", code: "OU" },
  { name: "Pegasus Airlines", code: "PC" },
  { name: "Aeroflot", code: "SU" },
  { name: "Air China", code: "CA" },
  { name: "China Southern Airlines", code: "CZ" },
  { name: "China Eastern Airlines", code: "MU" },
  { name: "Hainan Airlines", code: "HU" },
  { name: "EVA Air", code: "BR" },
  { name: "China Airlines", code: "CI" },
  { name: "Asiana Airlines", code: "OZ" },
  { name: "Vietnam Airlines", code: "VN" },
  { name: "VietJet Air", code: "VJ" },
  { name: "Philippine Airlines", code: "PR" },
  { name: "Cebu Pacific", code: "5J" },
  { name: "Garuda Indonesia", code: "GA" },
  { name: "Lion Air", code: "JT" },
  { name: "AirAsia", code: "AK" },
  { name: "Scoot", code: "TR" },
  { name: "Bangkok Airways", code: "PG" },
  { name: "Qantas", code: "QF" },
  { name: "Virgin Australia", code: "VA" },
  { name: "Jetstar Airways", code: "JQ" },
  { name: "Air New Zealand", code: "NZ" },
  { name: "Fiji Airways", code: "FJ" },
  { name: "South African Airways", code: "SA" },
  { name: "Ethiopian Airlines", code: "ET" },
  { name: "Kenya Airways", code: "KQ" },
  { name: "EgyptAir", code: "MS" },
  { name: "Royal Air Maroc", code: "AT" },
  { name: "Tunisair", code: "TU" },
  { name: "Royal Jordanian", code: "RJ" },
  { name: "Gulf Air", code: "GF" },
  { name: "Kuwait Airways", code: "KU" },
  { name: "Oman Air", code: "WY" },
  { name: "Saudia", code: "SV" },
  { name: "flydubai", code: "FZ" },
  { name: "Air Arabia", code: "G9" },
  { name: "El Al Israel Airlines", code: "LY" },
  { name: "Pakistan International Airlines", code: "PK" },
  { name: "Biman Bangladesh Airlines", code: "BG" },
  { name: "SriLankan Airlines", code: "UL" },
  { name: "Uzbekistan Airways", code: "HY" },
  { name: "Air Astana", code: "KC" },
  { name: "Hawaiian Airlines", code: "HA" },
  { name: "Virgin Atlantic", code: "VS" },
  { name: "Eurowings", code: "EW" },
  { name: "Condor", code: "DE" },
  { name: "Transavia", code: "HV" },
  { name: "Air Europa", code: "UX" },
  { name: "Royal Brunei Airlines", code: "BI" },
  { name: "Myanmar Airways International", code: "8M" },
  { name: "Druk Air", code: "KB" },
  { name: "Maldivian", code: "Q2" },
];

/**
 * Instant "starts with" search over airline names and IATA codes, so both
 * "Qat" and "QR" find Qatar Airways.
 */
export function searchAirlines(query: string, limit = 8): Airline[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const startsWith: Airline[] = [];
  const contains: Airline[] = [];

  for (const airline of AIRLINES) {
    const name = airline.name.toLowerCase();
    const code = airline.code.toLowerCase();

    if (name.startsWith(q) || code === q) startsWith.push(airline);
    else if (name.includes(q)) contains.push(airline);
  }

  return [...startsWith, ...contains].slice(0, limit);
}
