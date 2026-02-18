import { calculateDistance } from '../utils/distance';

/**
 * Greedy Nearest Neighbor algorithm for route optimization
 * Time complexity: O(n²)
 * Good for <50 locations
 */
export function optimizeRouteGreedy(currentLocation, stores) {
  if (!stores || stores.length === 0) {
    return [];
  }

  if (stores.length === 1) {
    return [stores[0]];
  }

  const route = [];
  const unvisited = new Set(stores.map(s => s.id));
  let current = currentLocation;

  while (unvisited.size > 0) {
    let nearestStore = null;
    let minDistance = Infinity;

    // Find nearest unvisited store
    for (const storeId of unvisited) {
      const store = stores.find(s => s.id === storeId);
      if (!store) continue;

      const distance = calculateDistance(
        current.lat,
        current.lng,
        store.coordinates.lat,
        store.coordinates.lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestStore = store;
      }
    }

    if (nearestStore) {
      route.push(nearestStore);
      unvisited.delete(nearestStore.id);
      current = nearestStore.coordinates;
    } else {
      break;
    }
  }

  return route;
}

/**
 * 2-Opt optimization to improve greedy route
 * Tries to eliminate route crossings
 */
export function optimize2Opt(route, maxIterations = 100) {
  if (!route || route.length < 4) {
    return route;
  }

  let improved = true;
  let iterations = 0;
  let currentRoute = [...route];

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < currentRoute.length - 2; i++) {
      for (let j = i + 2; j < currentRoute.length; j++) {
        // Calculate current distance
        const currentDist =
          getSegmentDistance(currentRoute, i, i + 1) +
          getSegmentDistance(currentRoute, j, (j + 1) % currentRoute.length);

        // Calculate swapped distance
        const swappedDist =
          getSegmentDistance(currentRoute, i, j) +
          getSegmentDistance(currentRoute, i + 1, (j + 1) % currentRoute.length);

        // If swapping improves the route
        if (swappedDist < currentDist) {
          // Reverse the segment between i+1 and j
          currentRoute = [
            ...currentRoute.slice(0, i + 1),
            ...currentRoute.slice(i + 1, j + 1).reverse(),
            ...currentRoute.slice(j + 1)
          ];
          improved = true;
        }
      }
    }
  }

  return currentRoute;
}

/**
 * Get distance between two route segments
 */
function getSegmentDistance(route, i, j) {
  if (i >= route.length || j >= route.length) {
    return 0;
  }

  const a = route[i].coordinates;
  const b = route[j].coordinates;

  return calculateDistance(a.lat, a.lng, b.lat, b.lng);
}

/**
 * Calculate total route distance
 */
export function calculateTotalDistance(currentLocation, route) {
  if (!route || route.length === 0) {
    return 0;
  }

  let total = 0;
  let current = currentLocation;

  for (const store of route) {
    total += calculateDistance(
      current.lat,
      current.lng,
      store.coordinates.lat,
      store.coordinates.lng
    );
    current = store.coordinates;
  }

  return total;
}

/**
 * Calculate route statistics
 */
export function calculateRouteStats(currentLocation, route, transportMode = 'mixed') {
  if (!route || route.length === 0) {
    return {
      totalDistance: 0,
      totalTime: 0,
      totalCost: 0,
      stops: 0
    };
  }

  const totalDistance = calculateTotalDistance(currentLocation, route);

  // Estimate time based on transport mode
  let totalTime = 0;
  let totalCost = 0;

  if (transportMode === 'walking') {
    totalTime = (totalDistance / 3) * 60; // 3 mph walking speed
    totalCost = 0;
  } else if (transportMode === 'subway') {
    // Assume mostly subway with some walking
    totalTime = (route.length * 15) + 20; // 15 min per stop + 20 min buffer
    totalCost = (route.length + 1) * 3.00; // Subway fare per segment
  } else {
    // Mixed mode: estimate based on distance
    // <0.5 miles: walk, >0.5 miles: subway
    let current = currentLocation;
    for (const store of route) {
      const segmentDistance = calculateDistance(
        current.lat,
        current.lng,
        store.coordinates.lat,
        store.coordinates.lng
      );

      if (segmentDistance < 0.5) {
        // Walking
        totalTime += (segmentDistance / 3) * 60;
      } else {
        // Subway
        totalTime += 15; // Average subway trip
        totalCost += 3.00;
      }

      current = store.coordinates;
    }
  }

  return {
    totalDistance: Math.round(totalDistance * 100) / 100, // Round to 2 decimals
    totalTime: Math.round(totalTime),
    totalCost: Math.round(totalCost * 100) / 100,
    stops: route.length
  };
}

/**
 * Find optimal insertion point for a new store
 * Returns the best index to insert the new store in the route
 */
export function findOptimalInsertionPoint(currentLocation, route, newStore) {
  if (!route || route.length === 0) {
    return 0;
  }

  let minIncrease = Infinity;
  let bestIndex = route.length; // Default to end

  // Try inserting at each position
  for (let i = 0; i <= route.length; i++) {
    const testRoute = [
      ...route.slice(0, i),
      newStore,
      ...route.slice(i)
    ];

    const newDistance = calculateTotalDistance(currentLocation, testRoute);
    const currentDistance = calculateTotalDistance(currentLocation, route);
    const increase = newDistance - currentDistance;

    if (increase < minIncrease) {
      minIncrease = increase;
      bestIndex = i;
    }
  }

  return bestIndex;
}
