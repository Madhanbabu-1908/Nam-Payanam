import { useEffect, useRef, useState } from "react";
import Map, { Source, Layer, Marker } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface RouteGeoJSON {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
}

export default function PublicTrackPage({ trip }: any) {
  const mapRef = useRef<any>(null);

  const [routeGeoJSON, setRouteGeoJSON] = useState<RouteGeoJSON | null>(null);
  const [vehiclePosition, setVehiclePosition] = useState<[number, number] | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [eta, setEta] = useState<number>(0);

  // 🗺️ Convert route
  useEffect(() => {
    if (trip?.route?.coordinates?.length > 1) {
      const geojson: RouteGeoJSON = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: trip.route.coordinates
        }
      };
      setRouteGeoJSON(geojson);

      // 🚀 Auto zoom to fit route
      const bounds = new maplibregl.LngLatBounds();
      trip.route.coordinates.forEach((coord: [number, number]) => {
        bounds.extend(coord);
      });

      setTimeout(() => {
        mapRef.current?.fitBounds(bounds, {
          padding: 50,
          duration: 1000
        });
      }, 500);

      // 📏 Calculate distance
      let total = 0;
      for (let i = 1; i < trip.route.coordinates.length; i++) {
        const [lng1, lat1] = trip.route.coordinates[i - 1];
        const [lng2, lat2] = trip.route.coordinates[i];
        total += getDistance(lat1, lng1, lat2, lng2);
      }
      setDistance(total);

      // ⏱️ ETA (assuming 40 km/h avg)
      setEta(total / 40);
    }
  }, [trip]);

  // 🚗 Animation along route
  useEffect(() => {
    if (!routeGeoJSON) return;

    let i = 0;
    const coords = routeGeoJSON.geometry.coordinates;

    const interval = setInterval(() => {
      if (i < coords.length) {
        setVehiclePosition(coords[i]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [routeGeoJSON]);

  // 🌐 WebSocket (Real-time tracking)
  useEffect(() => {
    const ws = new WebSocket("wss://your-backend-url/ws");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Expected: { lng, lat }
      if (data?.lng && data?.lat) {
        setVehiclePosition([data.lng, data.lat]);
      }
    };

    return () => ws.close();
  }, []);

  // 📏 Distance calculator (Haversine)
  function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  const shareUrl = window.location.href;

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      
      {/* 📊 Info Panel */}
      <div style={{
        position: "absolute",
        top: 10,
        left: 10,
        background: "white",
        padding: "10px",
        borderRadius: "10px",
        zIndex: 1
      }}>
        <div>📏 Distance: {distance.toFixed(2)} km</div>
        <div>⏱️ ETA: {eta.toFixed(1)} hrs</div>
        <button onClick={() => navigator.clipboard.writeText(shareUrl)}>
          🔗 Copy Tracking Link
        </button>
      </div>

      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 78.1460,
          latitude: 11.6643,
          zoom: 10
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >

        {/* 🛣️ Route */}
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              layout={{
                "line-cap": "round",
                "line-join": "round"
              }}
              paint={{
                "line-color": "#2563eb",
                "line-width": 4
              }}
            />
          </Source>
        )}

        {/* 🚗 Vehicle */}
        {vehiclePosition && (
          <Marker longitude={vehiclePosition[0]} latitude={vehiclePosition[1]}>
            <div style={{ fontSize: "24px" }}>🚗</div>
          </Marker>
        )}
      </Map>
    </div>
  );
}