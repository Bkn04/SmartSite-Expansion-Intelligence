/**
 * Foursquare Places API v3 – Competitor Search
 *
 * Free tier: 100,000 calls/month (no credit card required).
 * Sign up at https://foursquare.com/developers/
 * Add your key to .env:  VITE_FOURSQUARE_API_KEY=your_key_here
 *
 * Coverage is far superior to OpenStreetMap for NYC chain coffee shops.
 */

const FSQ_API_KEY = import.meta.env.VITE_FOURSQUARE_API_KEY;
const FSQ_BASE = 'https://api.foursquare.com/v3/places/search';

// Foursquare category IDs
const COFFEE_CATEGORY_ID = '13032'; // Coffee Shop
const CAFE_CATEGORY_ID   = '13035'; // Café

// Brand name → internal brand key
const BRAND_MAP = {
  starbucks:     'STARBUCKS',
  luckin:        'LUCKIN',
  'blank street':'BLANK_STREET',
  dunkin:        'DUNKIN',
  "dunkin'":     'DUNKIN',
  "dunkin donuts":'DUNKIN'
};

function detectBrandFromName(name = '') {
  const lower = name.toLowerCase();
  for (const [keyword, brand] of Object.entries(BRAND_MAP)) {
    if (lower.includes(keyword)) return brand;
  }
  return null;
}

/**
 * Search Foursquare for coffee competitors near a location.
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusMeters
 * @returns {Promise<Array>} competitors array
 */
export async function fetchCompetitorsFoursquare(lat, lng, radiusMeters = 322) {
  if (!FSQ_API_KEY) {
    return null; // Signal to caller: no key, fall back to OSM
  }

  try {
    const params = new URLSearchParams({
      ll: `${lat},${lng}`,
      radius: radiusMeters,
      categories: `${COFFEE_CATEGORY_ID},${CAFE_CATEGORY_ID}`,
      limit: 50,
      fields: 'fsq_id,name,geocodes,location,categories'
    });

    const res = await fetch(`${FSQ_BASE}?${params}`, {
      headers: {
        Authorization: FSQ_API_KEY,
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      console.error('Foursquare API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const results = data.results || [];

    const competitors = results
      .map(place => {
        const brand = detectBrandFromName(place.name);
        if (!brand) return null;

        const geo = place.geocodes?.main || place.geocodes?.roof;
        if (!geo) return null;

        return {
          id: `fsq-${place.fsq_id}`,
          name: place.name,
          brand,
          coordinates: {
            lat: geo.latitude,
            lng: geo.longitude
          },
          address: [
            place.location?.address,
            place.location?.locality
          ].filter(Boolean).join(', '),
          source: 'foursquare'
        };
      })
      .filter(Boolean);

    return competitors;
  } catch (err) {
    console.error('Foursquare fetch failed:', err);
    return null; // Fall back to OSM
  }
}

/**
 * Fetch competitors for multiple store locations via Foursquare.
 * Deduplicates by Foursquare place ID.
 */
export async function fetchCompetitorsForStoresFoursquare(stores, radiusMeters = 322) {
  const allCompetitors = new Map();

  for (const store of stores) {
    await new Promise(r => setTimeout(r, 200)); // gentle rate limiting

    const results = await fetchCompetitorsFoursquare(
      store.coordinates.lat,
      store.coordinates.lng,
      radiusMeters
    );

    if (results === null) return null; // No key – tell caller to use OSM

    results.forEach(c => {
      if (!allCompetitors.has(c.id)) {
        allCompetitors.set(c.id, { ...c, nearStores: [store.id] });
      } else {
        allCompetitors.get(c.id).nearStores.push(store.id);
      }
    });
  }

  return Array.from(allCompetitors.values());
}

/** True if a Foursquare API key is configured */
export function hasFoursquareKey() {
  return Boolean(FSQ_API_KEY);
}
