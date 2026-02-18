import { calculateDistance } from '../utils/distance';

/**
 * NYC Subway Lines and their colors
 */
export const SUBWAY_LINES = {
  '1': { name: '1', color: '#EE352E', type: 'IRT' },
  '2': { name: '2', color: '#EE352E', type: 'IRT' },
  '3': { name: '3', color: '#EE352E', type: 'IRT' },
  '4': { name: '4', color: '#00933C', type: 'IRT' },
  '5': { name: '5', color: '#00933C', type: 'IRT' },
  '6': { name: '6', color: '#00933C', type: 'IRT' },
  '7': { name: '7', color: '#B933AD', type: 'IRT' },
  'A': { name: 'A', color: '#0039A6', type: 'IND' },
  'C': { name: 'C', color: '#0039A6', type: 'IND' },
  'E': { name: 'E', color: '#0039A6', type: 'IND' },
  'B': { name: 'B', color: '#FF6319', type: 'IND' },
  'D': { name: 'D', color: '#FF6319', type: 'IND' },
  'F': { name: 'F', color: '#FF6319', type: 'IND' },
  'M': { name: 'M', color: '#FF6319', type: 'IND' },
  'G': { name: 'G', color: '#6CBE45', type: 'IND' },
  'J': { name: 'J', color: '#996633', type: 'BMT' },
  'Z': { name: 'Z', color: '#996633', type: 'BMT' },
  'L': { name: 'L', color: '#A7A9AC', type: 'BMT' },
  'N': { name: 'N', color: '#FCCC0A', type: 'BMT' },
  'Q': { name: 'Q', color: '#FCCC0A', type: 'BMT' },
  'R': { name: 'R', color: '#FCCC0A', type: 'BMT' },
  'W': { name: 'W', color: '#FCCC0A', type: 'BMT' },
  'S': { name: 'S', color: '#808183', type: 'Shuttle' },
};

/**
 * Key subway stations in NYC (simplified dataset)
 */
const NYC_SUBWAY_STATIONS = [
  // Manhattan - Midtown
  { id: 'times-sq-42', name: 'Times Sq-42 St', lat: 40.7580, lng: -73.9855, lines: ['1', '2', '3', '7', 'N', 'Q', 'R', 'W', 'S'] },
  { id: 'grand-central-42', name: 'Grand Central-42 St', lat: 40.7527, lng: -73.9772, lines: ['4', '5', '6', '7', 'S'] },
  { id: 'penn-station-34', name: '34 St-Penn Station', lat: 40.7505, lng: -73.9935, lines: ['1', '2', '3', 'A', 'C', 'E'] },
  { id: 'herald-sq-34', name: '34 St-Herald Sq', lat: 40.7498, lng: -73.9880, lines: ['B', 'D', 'F', 'M', 'N', 'Q', 'R', 'W'] },
  { id: '42-port-authority', name: '42 St-Port Authority', lat: 40.7570, lng: -73.9900, lines: ['A', 'C', 'E'] },
  { id: '5-ave-53', name: '5 Av/53 St', lat: 40.7605, lng: -73.9755, lines: ['E', 'M'] },
  { id: 'lexington-ave-53', name: 'Lexington Av/53 St', lat: 40.7577, lng: -73.9691, lines: ['E', 'M'] },
  { id: 'rockefeller-center', name: '47-50 Sts-Rockefeller Ctr', lat: 40.7589, lng: -73.9812, lines: ['B', 'D', 'F', 'M'] },

  // Manhattan - Downtown
  { id: '14-union-sq', name: '14 St-Union Sq', lat: 40.7347, lng: -73.9907, lines: ['4', '5', '6', 'L', 'N', 'Q', 'R', 'W'] },
  { id: 'wall-st', name: 'Wall St', lat: 40.7074, lng: -74.0110, lines: ['4', '5'] },
  { id: 'fulton-st', name: 'Fulton St', lat: 40.7095, lng: -74.0072, lines: ['2', '3', '4', '5', 'A', 'C', 'J', 'Z'] },
  { id: 'world-trade-center', name: 'World Trade Center', lat: 40.7126, lng: -74.0119, lines: ['E'] },
  { id: 'canal-st', name: 'Canal St', lat: 40.7190, lng: -74.0061, lines: ['1', '2', '3', 'A', 'C', 'E', 'J', 'N', 'Q', 'R', 'W', 'Z'] },
  { id: 'houston-st', name: 'Houston St', lat: 40.7283, lng: -73.9945, lines: ['1', '2'] },
  { id: 'christopher-st', name: 'Christopher St', lat: 40.7332, lng: -74.0028, lines: ['1', '2'] },

  // Manhattan - Uptown
  { id: '59-columbus-circle', name: '59 St-Columbus Circle', lat: 40.7682, lng: -73.9819, lines: ['1', '2', 'A', 'B', 'C', 'D'] },
  { id: '72-st', name: '72 St', lat: 40.7787, lng: -73.9816, lines: ['1', '2', '3', 'B', 'C'] },
  { id: '86-st', name: '86 St', lat: 40.7886, lng: -73.9762, lines: ['4', '5', '6'] },
  { id: '96-st', name: '96 St', lat: 40.7935, lng: -73.9725, lines: ['1', '2', '3', '6'] },
  { id: '125-st', name: '125 St', lat: 40.8075, lng: -73.9540, lines: ['2', '3', '4', '5', '6'] },

  // Brooklyn
  { id: 'atlantic-ave', name: 'Atlantic Av-Barclays Ctr', lat: 40.6845, lng: -73.9772, lines: ['2', '3', '4', '5', 'B', 'D', 'N', 'Q', 'R', 'W'] },
  { id: 'jay-st', name: 'Jay St-MetroTech', lat: 40.6923, lng: -73.9869, lines: ['A', 'C', 'F', 'R'] },
  { id: 'bedford-ave', name: 'Bedford Av', lat: 40.7176, lng: -73.9565, lines: ['L'] },
  { id: 'williamsburg-bridge', name: 'Marcy Av', lat: 40.7087, lng: -73.9576, lines: ['J', 'M', 'Z'] },

  // Queens
  { id: 'queensboro-plaza', name: 'Queensboro Plaza', lat: 40.7505, lng: -73.9401, lines: ['7', 'N', 'W'] },
  { id: 'court-sq', name: 'Court Sq-23 St', lat: 40.7471, lng: -73.9454, lines: ['E', 'M', 'G'] },
  { id: 'jackson-heights', name: 'Jackson Hts-Roosevelt Av', lat: 40.7465, lng: -73.8915, lines: ['7', 'E', 'F', 'M', 'R'] },
];

/**
 * Find nearest subway station to a location
 */
export function findNearestSubwayStation(lat, lng, maxDistance = 0.5) {
  let nearest = null;
  let minDistance = Infinity;

  for (const station of NYC_SUBWAY_STATIONS) {
    const distance = calculateDistance(lat, lng, station.lat, station.lng);
    if (distance < minDistance && distance <= maxDistance) {
      minDistance = distance;
      nearest = { ...station, distance };
    }
  }

  return nearest;
}

/**
 * Find multiple nearest stations (for transfer options)
 */
export function findNearestSubwayStations(lat, lng, limit = 3, maxDistance = 0.5) {
  const stations = NYC_SUBWAY_STATIONS
    .map(station => ({
      ...station,
      distance: calculateDistance(lat, lng, station.lat, station.lng)
    }))
    .filter(station => station.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return stations;
}

/**
 * Calculate subway route between two locations
 */
export function calculateSubwayRoute(fromLat, fromLng, toLat, toLng) {
  // Find nearest stations
  const originStations = findNearestSubwayStations(fromLat, fromLng, 3, 0.5);
  const destStations = findNearestSubwayStations(toLat, toLng, 3, 0.5);

  if (originStations.length === 0 || destStations.length === 0) {
    return null;
  }

  // Find common lines or best transfer
  const routes = [];

  for (const originStation of originStations) {
    for (const destStation of destStations) {
      // Check for direct lines (no transfer)
      const commonLines = originStation.lines.filter(line =>
        destStation.lines.includes(line)
      );

      if (commonLines.length > 0) {
        // Direct route
        const walkToStation = originStation.distance;
        const walkFromStation = destStation.distance;
        const estimatedSubwayTime = 5 + estimateStopsBetweenStations(originStation, destStation) * 2;

        routes.push({
          type: 'direct',
          origin: originStation,
          destination: destStation,
          lines: commonLines,
          walkToStation,
          walkFromStation,
          estimatedSubwayTime,
          totalTime: (walkToStation * 12) + estimatedSubwayTime + (walkFromStation * 12), // 12 min/mile walking
          transfers: 0,
          cost: 3.00
        });
      } else {
        // Transfer route (simplified)
        // Find a common transfer hub
        const transferHub = findTransferHub(originStation, destStation);
        if (transferHub) {
          const walkToStation = originStation.distance;
          const walkFromStation = destStation.distance;
          const estimatedSubwayTime = 5 + estimateStopsBetweenStations(originStation, transferHub) * 2
            + 5 + estimateStopsBetweenStations(transferHub, destStation) * 2;

          routes.push({
            type: 'transfer',
            origin: originStation,
            destination: destStation,
            transfer: transferHub,
            lines: [originStation.lines[0], destStation.lines[0]],
            walkToStation,
            walkFromStation,
            estimatedSubwayTime,
            totalTime: (walkToStation * 12) + estimatedSubwayTime + (walkFromStation * 12) + 5, // +5 min transfer
            transfers: 1,
            cost: 3.00 // Single fare covers transfers
          });
        }
      }
    }
  }

  // Sort by total time and return best route
  routes.sort((a, b) => a.totalTime - b.totalTime);
  return routes[0] || null;
}

/**
 * Estimate stops between stations (simplified)
 */
function estimateStopsBetweenStations(station1, station2) {
  const distance = calculateDistance(
    station1.lat, station1.lng,
    station2.lat, station2.lng
  );
  // Average stop spacing ~0.5 miles
  return Math.max(1, Math.round(distance / 0.5));
}

/**
 * Find transfer hub between two stations
 */
function findTransferHub(station1, station2) {
  // Major transfer hubs
  const transferHubs = [
    'times-sq-42',
    'grand-central-42',
    'penn-station-34',
    '14-union-sq',
    'fulton-st',
    'atlantic-ave'
  ];

  for (const hubId of transferHubs) {
    const hub = NYC_SUBWAY_STATIONS.find(s => s.id === hubId);
    if (!hub) continue;

    const hasLine1 = station1.lines.some(line => hub.lines.includes(line));
    const hasLine2 = station2.lines.some(line => hub.lines.includes(line));

    if (hasLine1 && hasLine2) {
      return hub;
    }
  }

  return null;
}

/**
 * Format subway route as human-readable instructions
 */
export function formatSubwayInstructions(route) {
  if (!route) return null;

  const instructions = [];

  // Walk to origin station
  if (route.walkToStation > 0.05) {
    instructions.push({
      type: 'walk',
      text: `步行 ${(route.walkToStation * 5280).toFixed(0)} 英尺至 ${route.origin.name} 站`,
      time: Math.round(route.walkToStation * 12),
      icon: '🚶'
    });
  }

  // Subway instructions
  if (route.type === 'direct') {
    instructions.push({
      type: 'subway',
      text: `乘坐 ${route.lines.map(l => SUBWAY_LINES[l]?.name || l).join('/')} 线`,
      subtext: `从 ${route.origin.name} 至 ${route.destination.name}`,
      time: route.estimatedSubwayTime,
      lines: route.lines,
      icon: '🚇'
    });
  } else if (route.type === 'transfer') {
    instructions.push({
      type: 'subway',
      text: `乘坐 ${route.lines[0]} 线至 ${route.transfer.name}`,
      time: Math.round(route.estimatedSubwayTime / 2),
      lines: [route.lines[0]],
      icon: '🚇'
    });
    instructions.push({
      type: 'transfer',
      text: `在 ${route.transfer.name} 换乘 ${route.lines[1]} 线`,
      time: 5,
      lines: [route.lines[1]],
      icon: '🔄'
    });
    instructions.push({
      type: 'subway',
      text: `继续乘坐 ${route.lines[1]} 线至 ${route.destination.name}`,
      time: Math.round(route.estimatedSubwayTime / 2),
      lines: [route.lines[1]],
      icon: '🚇'
    });
  }

  // Walk from destination station
  if (route.walkFromStation > 0.05) {
    instructions.push({
      type: 'walk',
      text: `从 ${route.destination.name} 站步行 ${(route.walkFromStation * 5280).toFixed(0)} 英尺至目的地`,
      time: Math.round(route.walkFromStation * 12),
      icon: '🚶'
    });
  }

  return {
    instructions,
    totalTime: Math.round(route.totalTime),
    cost: route.cost,
    transfers: route.transfers,
    originStation: route.origin,
    destinationStation: route.destination
  };
}

/**
 * Get all subway stations (for map display)
 */
export function getAllSubwayStations() {
  return NYC_SUBWAY_STATIONS;
}

/**
 * Get stations by line
 */
export function getStationsByLine(lineName) {
  return NYC_SUBWAY_STATIONS.filter(station =>
    station.lines.includes(lineName)
  );
}
