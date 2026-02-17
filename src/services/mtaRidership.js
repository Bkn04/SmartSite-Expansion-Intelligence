/**
 * MTA Ridership Service
 * Uses pre-processed historical MTA turnstile data (public, free).
 * Source: MTA Annual Ridership Reports – weekly average entries per station.
 */

import mtaData from '../data/mta-ridership.json';
import { calculateDistance } from '../utils/distance';

// NYC's busiest station weekly ridership (for normalization)
const MAX_WEEKLY_RIDERSHIP = 650000;

/**
 * Find the nearest MTA station to a coordinate and return its ridership data.
 * @param {number} lat
 * @param {number} lng
 * @param {number} maxDistanceMiles – ignore stations further than this
 * @returns {{ station, distance, weeklyRidership, footTrafficScore } | null}
 */
export function getNearestStationRidership(lat, lng, maxDistanceMiles = 0.75) {
  let nearest = null;
  let minDist = Infinity;

  for (const station of mtaData.stations) {
    const dist = calculateDistance(lat, lng, station.lat, station.lng);
    if (dist < minDist && dist <= maxDistanceMiles) {
      minDist = dist;
      nearest = station;
    }
  }

  if (!nearest) return null;

  const footTrafficScore = ridershipToScore(nearest.weeklyRidership, minDist);

  return {
    station: nearest,
    distance: minDist,
    weeklyRidership: nearest.weeklyRidership,
    footTrafficScore
  };
}

/**
 * Get up to N nearest stations within maxDistanceMiles.
 */
export function getNearestStations(lat, lng, limit = 3, maxDistanceMiles = 0.5) {
  return mtaData.stations
    .map(s => ({ ...s, distance: calculateDistance(lat, lng, s.lat, s.lng) }))
    .filter(s => s.distance <= maxDistanceMiles)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/**
 * Convert weekly ridership + walking distance to a 0–100 foot traffic score.
 * A Times Sq station at 100ft walk → ~95 points.
 * A small outer-borough station at 0.5mi walk → ~15 points.
 */
function ridershipToScore(weeklyRidership, distanceMiles) {
  // Base score from ridership volume (0–80)
  const ridershipScore = Math.min(80, (weeklyRidership / MAX_WEEKLY_RIDERSHIP) * 80);

  // Distance penalty (further = lower score, max –20)
  const distancePenalty = Math.min(20, distanceMiles * 40);

  return Math.max(0, Math.round(ridershipScore - distancePenalty));
}

/**
 * Get a human-readable ridership label for display.
 */
export function getRidershipLabel(weeklyRidership) {
  if (weeklyRidership >= 400000) return '超高客流枢纽';
  if (weeklyRidership >= 200000) return '高客流站';
  if (weeklyRidership >= 100000) return '中等客流站';
  if (weeklyRidership >= 50000)  return '普通站';
  return '小站';
}

/**
 * Format weekly ridership as a readable string (e.g. "29万/周").
 */
export function formatRidership(weeklyRidership) {
  if (weeklyRidership >= 10000) {
    return `${(weeklyRidership / 10000).toFixed(1)}万/周`;
  }
  return `${weeklyRidership.toLocaleString()}/周`;
}
