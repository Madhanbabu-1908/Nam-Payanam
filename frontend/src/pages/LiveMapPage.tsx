import { useEffect, useState } from "react";
import Map, { Source, Layer, Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

interface RouteGeoJSON {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
}

export default function LiveMapPage({ trip }: any) {
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<RouteGeoJSON | null>(null);

  // 📍 Get current location (example)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition((pos) => {
        setCurrentLocation([pos.coords.longitude, pos.coords.latitude]);
      });
    }
  }, []);

  // 🗺️ Convert backend route → GeoJSON
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
    }
  }, [trip]);

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Map
        initialViewState={{
          longitude: currentLocation?.[0] || 78.1460,
          latitude: currentLocation?.[1] || 11.6643,
          zoom: 12
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
        {/* 🚗 Current Location Marker */}
        {currentLocation && (
          <Marker longitude={currentLocation[0]} latitude={currentLocation[1]}>
            <div style={{ color: "red", fontSize: "20px" }}>📍</div>
          </Marker>
        )}

        {/* 🛣️ Route Line */}
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
                "line-color": "#4b5563",
                "line-width": 4,
                "line-opacity": 0.7
              }}
            />
          </Source>
        )}

        {/* 🧭 Traveled Path (optional example) */}
        {currentLocation && routeGeoJSON && (
          <Source
            id="traveled"
            type="geojson"
            data={{
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: routeGeoJSON.geometry.coordinates.slice(0, 10) // demo
              }
            }}
          >
            <Layer
              id="traveled-line"
              type="line"
              layout={{
                "line-cap": "round",
                "line-join": "round"
              }}
              paint={{
                "line-color": "#22c55e",
                "line-width": 5
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}