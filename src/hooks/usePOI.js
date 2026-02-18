import { useState, useEffect, useCallback } from 'react';
import { fetchPOIsNearLocation, analyzePOIDistribution, generateBusinessInsights } from '../services/poi';
import { storageKeys, poiStorage } from '../utils/storage';
import { CACHE_TTL } from '../utils/constants';

export function usePOI(stores, enabled = false) {
  const [pois, setPois] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load POIs when enabled
  useEffect(() => {
    if (enabled && stores && stores.length > 0) {
      loadPOIs();
    } else {
      setPois([]);
      setAnalysis(null);
      setInsights([]);
    }
  }, [enabled, stores]);

  // Load POIs from cache or API
  const loadPOIs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to load from cache — only if it exactly matches the current store set
      const cached = await poiStorage.get();

      if (cached && cached.pois && cached.pois.length > 0) {
        const currentStoreIds = new Set(stores.map(s => s.id));
        const cachedStoreIds  = new Set(cached.pois.flatMap(p => p.nearStores || []));

        const allCurrentCovered = stores.every(s => cachedStoreIds.has(s.id));
        const noRemovedStores   = Array.from(cachedStoreIds).every(id => currentStoreIds.has(id));

        if (allCurrentCovered && noRemovedStores) {
          setPois(cached.pois);
          const poiAnalysis = analyzePOIDistribution(cached.pois);
          setAnalysis(poiAnalysis);
          setInsights(generateBusinessInsights(poiAnalysis));
          setIsLoading(false);
          return;
        }
        // Store set changed — clear stale cache and do full reload
        await poiStorage.clear();
      }

      // Fetch from API for all stores
      const allPOIs = new Map();

      for (const store of stores) {
        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

        const storePOIs = await fetchPOIsNearLocation(
          store.coordinates.lat,
          store.coordinates.lng,
          500 // 500m radius
        );

        // Deduplicate POIs by ID
        storePOIs.forEach(poi => {
          if (!allPOIs.has(poi.id)) {
            allPOIs.set(poi.id, {
              ...poi,
              nearStores: [store.id]
            });
          } else {
            const existing = allPOIs.get(poi.id);
            existing.nearStores.push(store.id);
          }
        });
      }

      const freshPOIs = Array.from(allPOIs.values());
      setPois(freshPOIs);

      // Analyze POI distribution
      const poiAnalysis = analyzePOIDistribution(freshPOIs);
      setAnalysis(poiAnalysis);
      setInsights(generateBusinessInsights(poiAnalysis));

      // Save to cache
      await poiStorage.set(freshPOIs, CACHE_TTL.COMPETITORS);
    } catch (err) {
      console.error('Error loading POIs:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [stores]);

  // Refresh POIs
  const refreshPOIs = useCallback(async () => {
    await poiStorage.clear();
    await loadPOIs();
  }, [loadPOIs]);

  // Get POIs near a specific store
  const getPOIsNearStore = useCallback((storeId) => {
    return pois.filter(poi =>
      poi.nearStores && poi.nearStores.includes(storeId)
    );
  }, [pois]);

  return {
    pois,
    analysis,
    insights,
    isLoading,
    error,
    refreshPOIs,
    getPOIsNearStore
  };
}
