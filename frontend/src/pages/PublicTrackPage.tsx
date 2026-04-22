import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Trip = {
  id: string;
  route?: {
    type: "LineString";
    coordinates: [number, number][];
  };
};

type Location = {
  lng: number;
  lat: number;
};

export default function PublicTrackPage() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const vehicleMarker = useRef<maplibregl.Marker | null>(null);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [eta, setEta] = useState<number>(0);

  const tripId = window.location.pathname.split("/").pop();

  // ✅ Single ENV
  const API_URL = import.meta.env.VITE_API_URL;
  const WS_URL = API_URL.replace(/^http/, "ws");

  // 🚀 Fetch Trip
  useEffect(() => {
    if (!tripId) return;

    fetch(`${API_URL}/trips/${tripId}`)
      .then(res => res.json())
      .then(data => setTrip(data.data))
      .catch(err => console.error("Fetch trip failed:", err));
  }, [tripId]);

  // 🗺️ Initialize MapLibre
  useEffect(() => {
    if (!mapContainer.current) return;

    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://demotiles.maplibre.org/style.json", // ✅ FREE STYLE
      center: [78.9629, 20.5937],
      zoom: 4,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl());

    return () => mapRef.current?.remove();
  }, []);

  // 🚀 Draw Route + Auto Fit
  useEffect(() => {
    if (!trip || !trip.route || !mapRef.current) return;

    const map = mapRef.current;
    const coords = trip.route.coordinates;

    if (!map.getSource("route")) {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: trip.route,
        },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#007bff",
          "line-width": 4,
        },
      });
    }

    // ✅ Auto fit route
    const bounds = new maplibregl.LngLatBounds();
    coords.forEach(c => bounds.extend(c));
    map.fitBounds(bounds, { padding: 50 });

    // 📏 Calculate distance
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      total += getDistance(coords[i - 1], coords[i]);
    }
    setDistance(total);

    // ⏱ ETA (avg speed 40km/h)
    setEta(total / 40);

  }, [trip]);

  // 🚗 WebSocket real-time tracking
  useEffect(() => {
    if (!mapRef.current || !tripId) return;

    const socket = new WebSocket(`${WS_URL}/track/${tripId}`);

    socket.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    socket.onmessage = (event) => {
      const loc: Location = JSON.parse(event.data);
      animateVehicle(loc);
    };

    socket.onerror = (err) => {
      console.error("❌ WebSocket error:", err);
    };

    socket.onclose = () => {
      console.log("🔌 WebSocket disconnected");
    };

    return () => socket.close();
  }, [tripId]);

  // 🚗 Smooth vehicle animation
  const animateVehicle = (target: Location) => {
    if (!mapRef.current) return;

    if (!vehicleMarker.current) {
      const el = document.createElement("div");
      el.innerHTML = "🚗";
      el.style.fontSize = "28px";

      vehicleMarker.current = new maplibregl.Marker(el)
        .setLngLat([target.lng, target.lat])
        .addTo(mapRef.current);

      return;
    }

    const start = vehicleMarker.current.getLngLat();
    const duration = 1000;
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);

      const lng = start.lng + (target.lng - start.lng) * progress;
      const lat = start.lat + (target.lat - start.lat) * progress;

      vehicleMarker.current!.setLngLat([lng, lat]);

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  };

  // 📏 Distance (Haversine)
  const getDistance = (a: [number, number], b: [number, number]) => {
    const R = 6371;
    const dLat = (b[1] - a[1]) * Math.PI / 180;
    const dLng = (b[0] - a[0]) * Math.PI / 180;

    const lat1 = a[1] * Math.PI / 180;
    const lat2 = b[1] * Math.PI / 180;

    const val =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

    return 2 * R * Math.atan2(Math.sqrt(val), Math.sqrt(1 - val));
  };

  // 🔗 Share link
  const share = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Tracking link copied!");
  };

  return (
    <div className="h-screen flex flex-col">

      {/* 🔥 Info Bar */}
      <div className="p-4 bg-white shadow flex justify-between items-center">
        <div>
          <h2 className="font-bold text-lg">Live Tracking</h2>
          <p>Distance: {distance.toFixed(2)} km</p>
          <p>ETA: {eta.toFixed(2)} hrs</p>
        </div>

        <button
          onClick={share}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Share 🔗
        </button>
      </div>

      {/* 🗺️ Map */}
      <div ref={mapContainer} className="flex-1" />
    </div>
  );
}