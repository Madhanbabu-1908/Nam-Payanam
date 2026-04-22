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

export default function PublicTrackPage({ trip }: any) {
  const [routeGeoJSON, setRouteGeoJSON] = useState<RouteGeoJSON | null>(null);

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

  // 📍 Optional: Get start & destination markers
  const start = trip?.route?.coordinates?.[0];
  const end = trip?.route?.coordinates?.[
    trip?.route?.coordinates?.length - 1
  ];

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Map
        initialViewState={{
          longitude: start?.[0] || 78.1460,
          latitude: start?.[1] || 11.6643,
          zoom: 10
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
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
                "line-color": "#2563eb",
                "line-width": 4,
                "line-opacity": 0.8
              }}
            />
          </Source>
        )}

        {/* 🟢 Start Marker */}
        {start && (
          <Marker longitude={start[0]} latitude={start[1]}>
            <div style={{ fontSize: "20px" }}>🟢</div>
          </Marker>
        )}

        {/* 🔴 End Marker */}
        {end && (
          <Marker longitude={end[0]} latitude={end[1]}>
            <div style={{ fontSize: "20px" }}>🔴</div>
          </Marker>
        )}
      </Map>
    </div>
  );
}