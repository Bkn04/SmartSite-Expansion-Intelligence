import axios from 'axios';
import { API_CONFIG, ERROR_MESSAGES } from '../utils/constants';

/**
 * Geocode an address to coordinates using Nominatim API
 */
export async function geocodeAddress(address) {
  try {
    const response = await axios.get(`${API_CONFIG.NOMINATIM_BASE_URL}/search`, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        countrycodes: 'us',
        bounded: 1,
        viewbox: '-74.2591,40.4774,-73.7004,40.9176' // NYC bounds
      },
      headers: {
        'User-Agent': 'SmartSiteExpansionIntelligence/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        displayName: result.display_name,
        success: true
      };
    }

    return {
      success: false,
      error: ERROR_MESSAGES.GEOCODING_FAILED
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      error: error.message || ERROR_MESSAGES.NETWORK_ERROR
    };
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(lat, lng) {
  try {
    const response = await axios.get(`${API_CONFIG.NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat,
        lon: lng,
        format: 'json'
      },
      headers: {
        'User-Agent': 'SmartSiteExpansionIntelligence/1.0'
      }
    });

    if (response.data && response.data.display_name) {
      return {
        address: response.data.display_name,
        success: true
      };
    }

    return {
      success: false,
      error: 'Unable to find address'
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      success: false,
      error: error.message || ERROR_MESSAGES.NETWORK_ERROR
    };
  }
}

/**
 * Search for addresses with autocomplete
 */
export async function searchAddresses(query) {
  try {
    if (query.length < 3) {
      return [];
    }

    const response = await axios.get(`${API_CONFIG.NOMINATIM_BASE_URL}/search`, {
      params: {
        q: query + ', New York, NY',
        format: 'json',
        limit: 5,
        countrycodes: 'us',
        bounded: 1,
        viewbox: '-74.2591,40.4774,-73.7004,40.9176'
      },
      headers: {
        'User-Agent': 'SmartSiteExpansionIntelligence/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      return response.data.map(item => ({
        label: item.display_name,
        value: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }));
    }

    return [];
  } catch (error) {
    console.error('Address search error:', error);
    return [];
  }
}

/**
 * Batch geocode multiple addresses
 */
export async function geocodeAddresses(addresses) {
  const results = [];

  for (const address of addresses) {
    // Add delay to respect API rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = await geocodeAddress(address);
    results.push({
      address,
      ...result
    });
  }

  return results;
}

/**
 * Validate if coordinates are within NYC bounds
 */
export function isWithinNYCBounds(lat, lng) {
  const bounds = {
    north: 40.9176,
    south: 40.4774,
    east: -73.7004,
    west: -74.2591
  };

  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}
