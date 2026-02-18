// API Configuration
export const API_CONFIG = {
  NOMINATIM_BASE_URL: 'https://nominatim.openstreetmap.org',
  OVERPASS_BASE_URL: 'https://overpass-api.de/api/interpreter',
  OPENROUTE_BASE_URL: 'https://api.openrouteservice.org',
  // Note: Add your OpenRouteService API key here if you want to use their service
  // Free tier: 2000 requests/day
  // OPENROUTE_API_KEY: 'your-api-key-here',
};

// NYC Geographic Bounds
export const NYC_BOUNDS = {
  north: 40.9176,
  south: 40.4774,
  east: -73.7004,
  west: -74.2591,
  center: {
    lat: 40.7589,
    lng: -73.9851 // Times Square
  }
};

// Transportation Settings
export const TRANSPORT = {
  SUBWAY_FARE: 3.00,
  BUS_FARE: 3.00,
  PATH_FARE: 2.90,

  // Distance thresholds in miles
  WALKING_MAX: 0.3,
  BUS_THRESHOLD: 0.5,
  SUBWAY_THRESHOLD: 0.5,

  // Average speeds in mph
  WALKING_SPEED: 3,
  BUS_SPEED: 8,
  SUBWAY_SPEED: 17
};

// Competitor Brands
export const COMPETITORS = {
  STARBUCKS: {
    name: 'Starbucks',
    color: '#00704A',
    icon: '☕'
  },
  LUCKIN: {
    name: 'Luckin Coffee',
    color: '#3D7EFF',
    icon: '☕'
  },
  BLANK_STREET: {
    name: 'Blank Street',
    color: '#FF6B35',
    icon: '☕'
  },
  DUNKIN: {
    name: "Dunkin'",
    color: '#FF6600',
    icon: '🍩'
  }
};

// Map Settings
export const MAP_CONFIG = {
  DEFAULT_ZOOM: 13,
  MIN_ZOOM: 10,
  MAX_ZOOM: 18,
  TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',

  // Marker colors
  STORE_COLOR: '#2563EB', // Blue
  CURRENT_LOCATION_COLOR: '#10B981', // Green
  ROUTE_COLOR: '#8B5CF6', // Purple

  // Competitor search radius in meters
  COMPETITOR_RADIUS: 500
};

// LocalStorage Keys
export const STORAGE_KEYS = {
  STORES: 'cotti_stores',
  CURRENT_LOCATION: 'cotti_current_location',
  ROUTE: 'cotti_route',
  COMPETITORS: 'cotti_competitors',
  PREFERENCES: 'cotti_preferences'
};

// Cache TTL (Time To Live) in milliseconds
export const CACHE_TTL = {
  COMPETITORS: 24 * 60 * 60 * 1000, // 24 hours
  GEOCODING: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Route Optimization Settings
export const OPTIMIZATION = {
  ALGORITHM: 'greedy', // 'greedy' or '2-opt'
  MAX_STORES: 50 // Maximum number of stores for optimization
};

// Error Messages
export const ERROR_MESSAGES = {
  GEOCODING_FAILED: '地址解析失败，请检查地址是否正确',
  NETWORK_ERROR: '网络请求失败，请检查网络连接',
  INVALID_ADDRESS: '无效的地址格式',
  MAX_STORES_EXCEEDED: `最多支持 ${OPTIMIZATION.MAX_STORES} 个店铺`,
  NO_ROUTE_FOUND: '无法找到合适的路线'
};
