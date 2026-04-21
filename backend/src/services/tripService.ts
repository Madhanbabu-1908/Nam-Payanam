import { supabaseAdmin } from '../config/db';
import axios from 'axios'; // You'll need to install axios if not already

// Geocoding function using OpenStreetMap Nominatim (free, no API key needed for low usage)
const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'Nam-Payanam/1.0' // Required by OSM policy
      }
    });

    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      return [parseFloat(lat), parseFloat(lon)];
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

export const tripService = {
  createTrip: async (data: any) => {
    // Geocode start_location and destination
    let startCoords: [number, number] | null = null;
    let endCoords: [number, number] | null = null;

    if (data.start_location) {
      startCoords = await geocodeAddress(data.start_location);
    }
    if (data.destination) {
      endCoords = await geocodeAddress(data.destination);
    }

    // Add coordinates to trip data
    const tripData = {
      ...data,
      start_latitude: startCoords ? startCoords[0] : null,
      start_longitude: startCoords ? startCoords[1] : null,
      end_latitude: endCoords ? endCoords[0] : null,
      end_longitude: endCoords ? endCoords[1] : null,
    };

    const { data: newTrip, error } = await supabaseAdmin
      .from('trips')
      .insert(tripData)
      .select()
      .single();
    
    if (error) throw error;
    return newTrip;
  },

  getTripById: async (id: string) => {
    const { data, error } = await supabaseAdmin
      .from('trips')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteTrip: async (id: string) => {
    const { error } = await supabaseAdmin.from('trips').delete().eq('id', id);
    if (error) throw error;
  }
};