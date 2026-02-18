import { useState, useEffect, useCallback } from 'react';
import { fetchCompetitorsForStores } from '../services/competitors';
import { fetchCompetitorsForStoresFoursquare, hasFoursquareKey } from '../services/foursquare';
import { competitorStorage } from '../utils/storage';
import { CACHE_TTL } from '../utils/constants';

export function useCompetitors(stores, enabled = false) {
  const [competitors, setCompetitors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('osm'); // 'foursquare' | 'osm'

  // Load competitors when enabled
  useEffect(() => {
    if (enabled && stores && stores.length > 0) {
      loadCompetitors();
    } else {
      setCompetitors([]);
    }
  }, [enabled, stores]);

  // Load competitors: try Foursquare first, fall back to OSM Overpass
  const loadCompetitors = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try cache — only if it covers ALL current stores
      const cached = await competitorStorage.get();
      if (cached && cached.competitors && cached.competitors.length > 0) {
        const cachedStoreIds = new Set(cached.competitors.flatMap(c => c.nearStores || []));
        const allStoresCovered = stores.every(s => cachedStoreIds.has(s.id));

        if (allStoresCovered) {
          setCompetitors(cached.competitors);
          setDataSource(cached.source || 'osm');
          setIsLoading(false);
          return;
        }
        // New store added — fall through to full reload
      }

      let freshCompetitors = null;

      // Attempt Foursquare (0.2 miles = 322 meters)
      if (hasFoursquareKey()) {
        freshCompetitors = await fetchCompetitorsForStoresFoursquare(stores, 322);
        if (freshCompetitors !== null) {
          setDataSource('foursquare');
        }
      }

      // Fall back to Overpass / OSM
      if (freshCompetitors === null) {
        freshCompetitors = await fetchCompetitorsForStores(stores, 322);
        setDataSource('osm');
      }

      setCompetitors(freshCompetitors);

      // Cache with source tag
      await competitorStorage.set(freshCompetitors, CACHE_TTL.COMPETITORS);
    } catch (err) {
      console.error('Error loading competitors:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [stores]);

  // Refresh (clear cache then reload)
  const refreshCompetitors = useCallback(async () => {
    await competitorStorage.clear();
    await loadCompetitors();
  }, [loadCompetitors]);

  // Competitors near a specific store
  const getCompetitorsNearStore = useCallback((storeId) => {
    return competitors.filter(c => c.nearStores && c.nearStores.includes(storeId));
  }, [competitors]);

  return {
    competitors,
    isLoading,
    error,
    dataSource,
    refreshCompetitors,
    getCompetitorsNearStore
  };
}
