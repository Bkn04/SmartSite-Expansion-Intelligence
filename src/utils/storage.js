import localforage from 'localforage';
import { STORAGE_KEYS } from './constants';

// Configure localforage
localforage.config({
  name: 'SmartSiteExpansionIntelligence',
  version: 1.0,
  storeName: 'smartsite_data'
});

/**
 * Storage utilities using LocalForage for better performance and capacity
 */

// Store management
export const storeStorage = {
  async get() {
    try {
      const stores = await localforage.getItem(STORAGE_KEYS.STORES);
      return stores || [];
    } catch (error) {
      console.error('Error reading stores:', error);
      return [];
    }
  },

  async set(stores) {
    try {
      await localforage.setItem(STORAGE_KEYS.STORES, stores);
      return true;
    } catch (error) {
      console.error('Error saving stores:', error);
      return false;
    }
  },

  async add(store) {
    const stores = await this.get();
    stores.push(store);
    return await this.set(stores);
  },

  async update(storeId, updates) {
    const stores = await this.get();
    const index = stores.findIndex(s => s.id === storeId);
    if (index !== -1) {
      stores[index] = { ...stores[index], ...updates };
      return await this.set(stores);
    }
    return false;
  },

  async remove(storeId) {
    const stores = await this.get();
    const filtered = stores.filter(s => s.id !== storeId);
    return await this.set(filtered);
  },

  async clear() {
    return await this.set([]);
  }
};

// Current location storage
export const locationStorage = {
  async get() {
    try {
      return await localforage.getItem(STORAGE_KEYS.CURRENT_LOCATION);
    } catch (error) {
      console.error('Error reading current location:', error);
      return null;
    }
  },

  async set(location) {
    try {
      await localforage.setItem(STORAGE_KEYS.CURRENT_LOCATION, location);
      return true;
    } catch (error) {
      console.error('Error saving current location:', error);
      return false;
    }
  }
};

// Route storage
export const routeStorage = {
  async get() {
    try {
      return await localforage.getItem(STORAGE_KEYS.ROUTE);
    } catch (error) {
      console.error('Error reading route:', error);
      return null;
    }
  },

  async set(route) {
    try {
      await localforage.setItem(STORAGE_KEYS.ROUTE, route);
      return true;
    } catch (error) {
      console.error('Error saving route:', error);
      return false;
    }
  }
};

// POI storage (with caching)
export const poiStorage = {
  async get() {
    try {
      const data = await localforage.getItem('cotti_pois');
      if (!data) return null;

      // Check if cache is expired
      const now = Date.now();
      if (data.cachedAt && now - data.cachedAt > data.ttl) {
        return null; // Cache expired
      }

      return data;
    } catch (error) {
      console.error('Error reading POIs:', error);
      return null;
    }
  },

  async set(pois, ttl = 24 * 60 * 60 * 1000) {
    try {
      const data = {
        pois,
        cachedAt: Date.now(),
        ttl
      };
      await localforage.setItem('cotti_pois', data);
      return true;
    } catch (error) {
      console.error('Error saving POIs:', error);
      return false;
    }
  },

  async clear() {
    try {
      await localforage.removeItem('cotti_pois');
      return true;
    } catch (error) {
      console.error('Error clearing POIs:', error);
      return false;
    }
  }
};

// Competitors storage (with caching)
export const competitorStorage = {
  async get() {
    try {
      const data = await localforage.getItem(STORAGE_KEYS.COMPETITORS);
      if (!data) return null;

      // Check if cache is expired
      const now = Date.now();
      if (data.cachedAt && now - data.cachedAt > data.ttl) {
        return null; // Cache expired
      }

      return data;
    } catch (error) {
      console.error('Error reading competitors:', error);
      return null;
    }
  },

  async set(competitors, ttl = 24 * 60 * 60 * 1000) {
    try {
      const data = {
        competitors,
        cachedAt: Date.now(),
        ttl
      };
      await localforage.setItem(STORAGE_KEYS.COMPETITORS, data);
      return true;
    } catch (error) {
      console.error('Error saving competitors:', error);
      return false;
    }
  },

  async clear() {
    try {
      await localforage.removeItem(STORAGE_KEYS.COMPETITORS);
      return true;
    } catch (error) {
      console.error('Error clearing competitors:', error);
      return false;
    }
  }
};

// Preferences storage
export const preferencesStorage = {
  async get() {
    try {
      const prefs = await localforage.getItem(STORAGE_KEYS.PREFERENCES);
      return prefs || {
        transportPriority: ['subway', 'bus', 'walking'],
        maxWalkingDistance: 0.5,
        showCompetitors: true
      };
    } catch (error) {
      console.error('Error reading preferences:', error);
      return {
        transportPriority: ['subway', 'bus', 'walking'],
        maxWalkingDistance: 0.5,
        showCompetitors: true
      };
    }
  },

  async set(preferences) {
    try {
      await localforage.setItem(STORAGE_KEYS.PREFERENCES, preferences);
      return true;
    } catch (error) {
      console.error('Error saving preferences:', error);
      return false;
    }
  }
};

// Clear all storage
export async function clearAllStorage() {
  try {
    await localforage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing storage:', error);
    return false;
  }
}

// Export storage size
export async function getStorageSize() {
  try {
    const keys = await localforage.keys();
    let totalSize = 0;

    for (const key of keys) {
      const value = await localforage.getItem(key);
      totalSize += new Blob([JSON.stringify(value)]).size;
    }

    return {
      sizeBytes: totalSize,
      sizeKB: (totalSize / 1024).toFixed(2),
      sizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      itemCount: keys.length
    };
  } catch (error) {
    console.error('Error calculating storage size:', error);
    return null;
  }
}
