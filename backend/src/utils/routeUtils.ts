import axios from 'axios';

/**
 * Fetches real driving route coordinates between two points using OSRM.
 * @param start [lat, lng]
 * @param end [lat, lng]
 * @returns Array of [lat, lng] coordinates
 */
export const getRealRoute = async (start: [number, number], end: [number, number]): Promise<[number, number][]> => {
  try {
    // OSRM expects coordinates in lng,lat format
    const url = `http://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    
    const res = await axios.get(url);
    
    if (res.data.routes && res.data.routes.length > 0) {
      // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
      return res.data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
    }
    return [];
  } catch (e) {
    console.error("OSRM Routing Error:", e);
    return [];
  }
};