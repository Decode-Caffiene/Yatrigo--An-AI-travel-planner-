export interface DestinationSuggestion {
  name: string;
  country: string | null;
  label: string;
}

// Well-known countries and cities, roughly ordered by how likely a
// traveler is to search for them — so a short prefix like "N" surfaces
// Nepal/New York/Nairobi before obscure matches. Not an exhaustive gazetteer
// (that needs a real geocoding service), but instant and predictable,
// which is what a destination field needs most.
const FAMOUS = [
  "France", "Italy", "Japan", "Spain", "Thailand", "United States",
  "United Kingdom", "Greece", "Indonesia", "Mexico", "Turkey", "Germany",
  "India", "Nepal", "Egypt", "Vietnam", "Portugal", "Switzerland",
  "Netherlands", "Australia", "New Zealand", "United Arab Emirates",
  "South Korea", "China", "Morocco", "Peru", "Brazil", "Argentina",
  "Iceland", "Croatia", "Austria", "Ireland", "Canada", "Singapore",
  "Malaysia", "Philippines", "Sri Lanka", "Cambodia", "Jordan", "Kenya",
  "Tanzania", "South Africa", "Norway", "Sweden", "Denmark", "Finland",
  "Czech Republic", "Hungary", "Poland", "Israel", "Cuba", "Costa Rica",
  "Colombia", "Chile", "Fiji", "Maldives", "Bali",
  "Paris, France", "London, United Kingdom", "New York, United States",
  "Tokyo, Japan", "Rome, Italy", "Barcelona, Spain", "Dubai, United Arab Emirates",
  "Bangkok, Thailand", "Kathmandu, Nepal", "New Delhi, India", "Mumbai, India",
  "Nagoya, Japan", "Osaka, Japan", "Kyoto, Japan", "Nairobi, Kenya",
  "Cairo, Egypt", "Istanbul, Turkey", "Athens, Greece", "Amsterdam, Netherlands",
  "Berlin, Germany", "Venice, Italy", "Florence, Italy", "Milan, Italy",
  "Prague, Czech Republic", "Vienna, Austria", "Budapest, Hungary",
  "Lisbon, Portugal", "Madrid, Spain", "Sydney, Australia", "Melbourne, Australia",
  "Auckland, New Zealand", "Toronto, Canada", "Vancouver, Canada",
  "Los Angeles, United States", "San Francisco, United States",
  "Chicago, United States", "Miami, United States", "Las Vegas, United States",
  "Rio de Janeiro, Brazil", "Buenos Aires, Argentina", "Cape Town, South Africa",
  "Marrakech, Morocco", "Zanzibar, Tanzania", "Seoul, South Korea",
  "Hong Kong", "Shanghai, China", "Beijing, China", "Kuala Lumpur, Malaysia",
  "Ho Chi Minh City, Vietnam", "Hanoi, Vietnam", "Siem Reap, Cambodia",
  "Reykjavik, Iceland", "Santorini, Greece", "Mykonos, Greece",
  "Dubrovnik, Croatia", "Edinburgh, United Kingdom", "Dublin, Ireland",
  "Copenhagen, Denmark", "Stockholm, Sweden", "Oslo, Norway",
  "Helsinki, Finland", "Zurich, Switzerland", "Geneva, Switzerland",
  "Munich, Germany", "Hamburg, Germany", "Brussels, Belgium",
  "Warsaw, Poland", "Moscow, Russia", "Doha, Qatar", "Abu Dhabi, United Arab Emirates",
  "Muscat, Oman", "Petra, Jordan", "Jerusalem, Israel", "Tel Aviv, Israel",
  "Havana, Cuba", "Cancun, Mexico", "Nassau, Bahamas",
  "Newcastle, United Kingdom", "Nagpur, India", "Nice, France",
];

const OTHER_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola",
  "Antigua and Barbuda", "Armenia", "Azerbaijan", "Bahamas", "Bahrain",
  "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin",
  "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cameroon",
  "Central African Republic", "Chad", "Comoros", "Congo",
  "Democratic Republic of the Congo", "Cyprus", "Djibouti", "Dominica",
  "Dominican Republic", "Ecuador", "El Salvador", "Equatorial Guinea",
  "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Gabon", "Gambia",
  "Georgia", "Ghana", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Iran", "Iraq", "Ivory Coast", "Jamaica",
  "Kazakhstan", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos",
  "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
  "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Mali", "Malta",
  "Marshall Islands", "Mauritania", "Mauritius", "Micronesia", "Moldova",
  "Monaco", "Mongolia", "Montenegro", "Mozambique", "Myanmar", "Namibia",
  "Nauru", "Nicaragua", "Niger", "Nigeria", "North Korea",
  "North Macedonia", "Oman", "Pakistan", "Palau", "Palestine", "Panama",
  "Papua New Guinea", "Paraguay", "Qatar", "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Slovakia",
  "Slovenia", "Solomon Islands", "Somalia", "South Sudan", "Sudan",
  "Suriname", "Syria", "Taiwan", "Tajikistan", "Timor-Leste", "Togo",
  "Tonga", "Trinidad and Tobago", "Tunisia", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "Uruguay", "Uzbekistan", "Vanuatu",
  "Vatican City", "Venezuela", "Yemen", "Zambia", "Zimbabwe",
];

const OTHER_CITIES = [
  "Agra, India", "Alexandria, Egypt", "Antalya, Turkey", "Aspen, United States",
  "Bergen, Norway", "Bogota, Colombia", "Bruges, Belgium", "Cusco, Peru",
  "Da Nang, Vietnam", "Denver, United States", "Frankfurt, Germany",
  "Glasgow, United Kingdom", "Guangzhou, China", "Innsbruck, Austria",
  "Jaipur, India", "Johannesburg, South Africa", "Kigali, Rwanda",
  "Krakow, Poland", "Lima, Peru", "Lyon, France", "Manila, Philippines",
  "Medellin, Colombia", "Naples, Italy", "Oxford, United Kingdom",
  "Palermo, Italy", "Phnom Penh, Cambodia", "Phuket, Thailand",
  "Porto, Portugal", "Quebec City, Canada", "Queenstown, New Zealand",
  "Quito, Ecuador", "Salzburg, Austria", "Santiago, Chile",
  "Seville, Spain", "Shenzhen, China", "St. Petersburg, Russia",
  "Tbilisi, Georgia", "Ubud, Indonesia", "Valencia, Spain",
  "Vientiane, Laos", "Yerevan, Armenia", "York, United Kingdom",
];

function toSuggestion(entry: string): DestinationSuggestion {
  const commaIndex = entry.indexOf(", ");
  if (commaIndex === -1) {
    return { name: entry, country: null, label: entry };
  }
  return {
    name: entry.slice(0, commaIndex),
    country: entry.slice(commaIndex + 2),
    label: entry,
  };
}

const ALL_DESTINATIONS: DestinationSuggestion[] = [
  ...FAMOUS.map(toSuggestion),
  ...OTHER_COUNTRIES.map(toSuggestion),
  ...OTHER_CITIES.map(toSuggestion),
];

export function searchDestinations(query: string, limit = 8): DestinationSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matches: DestinationSuggestion[] = [];
  const seen = new Set<string>();

  for (const destination of ALL_DESTINATIONS) {
    if (!destination.name.toLowerCase().startsWith(q)) continue;
    if (seen.has(destination.label)) continue;

    seen.add(destination.label);
    matches.push(destination);

    if (matches.length >= limit) break;
  }

  return matches;
}
