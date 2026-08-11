import axios from "axios";

const SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php";
const COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "Yatrigo/1.0 (https://yatrigo.app; travel planner app)";

// A place's Wikipedia lead image is often a flag, coat of arms, or
// locator/relief map rather than a real photo — and those are reliably
// served as SVG/PNG, while genuine photographs on Wikimedia Commons are
// almost always JPEG. Requiring JPEG is far more robust than trying to
// blacklist every possible flag/map/diagram filename pattern (we tried
// that — new non-photo formats kept slipping through).
const isPhotograph = (url) => /\.jpe?g$/i.test(url.split("?")[0]);

// Wide enough to stay sharp on a full-width hero, small enough that we
// aren't pulling multi-megabyte originals for thumbnail-sized cards.
const TARGET_WIDTH = 1280;

/**
 * Wikimedia serves resized derivatives from a predictable /thumb/ path, so
 * point at one rather than the original. Some article images are 4000px+
 * and tens of megabytes — fetching those for a card is slow and gets the
 * CDN to rate-limit us (429), which then shows the user a placeholder.
 */
const toSizedUrl = (url) => {
  if (!url) return url;

  try {
    const { origin, pathname } = new URL(url);
    if (!origin.includes("upload.wikimedia.org")) return url;

    // Already a thumbnail: just swap the width segment.
    const thumbMatch = pathname.match(/^(.*\/thumb\/.*\/)\d+px-([^/]+)$/);
    if (thumbMatch) {
      return `${origin}${thumbMatch[1]}${TARGET_WIDTH}px-${thumbMatch[2]}`;
    }

    // An original (…/commons/a/ab/Foo.jpg) — derive its thumb path.
    const originalMatch = pathname.match(/^\/wikipedia\/([^/]+)\/([0-9a-f])\/([0-9a-f]{2})\/(.+)$/);
    if (originalMatch) {
      const [, wiki, a, ab, file] = originalMatch;
      return `${origin}/wikipedia/${wiki}/thumb/${a}/${ab}/${file}/${TARGET_WIDTH}px-${file}`;
    }

    return url;
  } catch {
    return url;
  }
};

// Commons is full of scanned newspapers, documents, portraits, and archival
// ephemera that are JPEGs and carry a place name in the filename — those
// pass the format check but read as obviously wrong on a travel card (we
// shipped a 1921 newspaper clipping for "Arkansas City" this way). Only the
// filename-search tier needs this; article lead images don't have the
// problem.
const ARCHIVAL_CONTENT_PATTERN =
  /newspaper|daily[_ ]news|gazette|herald|tribune|chronicle|journal|letter|document|manuscript|postcard|poster|stamp|coin|banknote|portrait|headstone|gravestone|obituary|advertisement|\b\d{4}[_ ]census\b/i;

const fetchSummaryImage = async (title) => {
  try {
    const { data } = await axios.get(`${SUMMARY_URL}${encodeURIComponent(title)}`, {
      headers: { "User-Agent": USER_AGENT },
      params: { redirect: true },
    });

    const url = data.originalimage?.source || data.thumbnail?.source || null;

    return url && isPhotograph(url) ? toSizedUrl(url) : null;
  } catch {
    return null;
  }
};

/**
 * Wikipedia's own search, so we find the right article even when the
 * caller's phrasing doesn't match its title — US cities in particular are
 * disambiguated by state ("Arkansas City, Kansas"), so a destination stored
 * as "Arkansas City, United States" never resolves by exact title.
 *
 * Results are required to actually be about the place: search happily
 * returns tangentially-related articles, and taking their lead image gives
 * nonsense (searching "Germany" surfaced a farm-ploughing photo this way).
 */
const fetchSearchedArticleImage = async (place) => {
  // "Arkansas City, United States" → "arkansas city": the country/state
  // suffix is exactly the part that tends not to match Wikipedia's title.
  const primaryName = place.split(",")[0].trim().toLowerCase();
  if (!primaryName) return null;

  try {
    const { data } = await axios.get(WIKIPEDIA_API_URL, {
      headers: { "User-Agent": USER_AGENT },
      params: {
        action: "query",
        generator: "search",
        gsrsearch: place,
        gsrlimit: 3,
        prop: "pageimages",
        piprop: "original|thumbnail",
        pithumbsize: 1600,
        format: "json",
        formatversion: 2,
      },
    });

    for (const page of data.query?.pages || []) {
      const title = page.title?.toLowerCase();
      if (!title) continue;

      // The article must be about the place itself, not a sub-topic that
      // merely carries its name — "Santorini International Airport" matched
      // a plain substring check and handed back a photo of a terminal.
      // Wikipedia disambiguates same-named places with a comma suffix
      // ("Arkansas City, Kansas"), so allow exactly that shape and nothing
      // else; genuine sub-topics append words instead.
      const isThePlace = title === primaryName || title.startsWith(`${primaryName}, `);
      if (!isThePlace) continue;

      const url = page.original?.source || page.thumbnail?.source;
      if (url && isPhotograph(url)) return toSizedUrl(url);
    }

    return null;
  } catch {
    return null;
  }
};

// Last-resort fallback for places whose Wikipedia article doesn't lead
// with a usable photo: search Commons directly for a photo file titled
// after the place (Commons filenames are reliably location-tagged).
const fetchCommonsSearchImage = async (place) => {
  const primaryName = place.split(",")[0].trim().toLowerCase();
  if (!primaryName) return null;

  try {
    const { data } = await axios.get(COMMONS_API_URL, {
      headers: { "User-Agent": USER_AGENT },
      params: {
        action: "query",
        generator: "search",
        gsrsearch: `intitle:"${place}" filetype:bitmap`,
        gsrnamespace: 6,
        gsrlimit: 10,
        prop: "imageinfo",
        iiprop: "url",
        iiurlwidth: 1600,
        format: "json",
      },
    });

    const pages = Object.values(data.query?.pages || {});

    for (const page of pages) {
      const title = page.title || "";

      // `intitle:` isn't strict — Commons also matches on metadata, which
      // returns files with no connection to the place in their name at all.
      // Since this tier's whole premise is "the filename names the place",
      // enforce that ourselves.
      if (!title.toLowerCase().includes(primaryName)) continue;
      if (ARCHIVAL_CONTENT_PATTERN.test(title)) continue;

      const url = page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url;
      if (url && isPhotograph(url)) return toSizedUrl(url);
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Photo taken from an actual Wikipedia *article* about the place — the
 * high-confidence tiers. A city article's lead image is a curated,
 * representative shot of that city, so this is the best source when it
 * hits. Excludes the Commons filename search, which is a keyword lottery
 * and belongs strictly at the end of the chain.
 */
export const getWikipediaArticleImage = async (place) =>
  (await fetchSummaryImage(place)) ||
  (await fetchSummaryImage(`Tourism in ${place}`)) ||
  (await fetchSearchedArticleImage(place));

/**
 * Real representative photo for a place. Tries, in order: the place's own
 * Wikipedia article, its "Tourism in X" article (countries usually lead
 * with a flag), a Wikipedia search to resolve near-miss titles, and finally
 * a Commons filename search. No API key required. Returns null on any
 * miss/error — this is a cosmetic enhancement, not something that should
 * ever fail the caller.
 */
export const getWikipediaImage = async (place) =>
  (await getWikipediaArticleImage(place)) ||
  (await fetchCommonsSearchImage(place));
