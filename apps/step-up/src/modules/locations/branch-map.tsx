import { useEffect, useState } from "react";
import styles from "./branch-map.module.scss";
import type { MapCoordinates } from "./types";

type BranchMapProps = {
  value: MapCoordinates | null;
  onChange: (value: MapCoordinates) => void;
  className?: string;
};

type MapModule = {
  MapContainer: typeof import("react-leaflet").MapContainer;
  Marker: typeof import("react-leaflet").Marker;
  TileLayer: typeof import("react-leaflet").TileLayer;
  useMapEvents: typeof import("react-leaflet").useMapEvents;
};

const DEFAULT_CENTER: MapCoordinates = {
  latitude: 12.9716,
  longitude: 77.5946,
};

function MapClickHandler({
  onChange,
  useMapEvents,
}: {
  onChange: (value: MapCoordinates) => void;
  useMapEvents: MapModule["useMapEvents"];
}) {
  useMapEvents({
    click(event) {
      onChange({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });
  return null;
}

export function BranchMap({ value, onChange, className }: BranchMapProps) {
  const [mapModule, setMapModule] = useState<MapModule | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([
      import("leaflet/dist/leaflet.css"),
      import("leaflet"),
      import("react-leaflet"),
    ]).then(([, leaflet, reactLeaflet]) => {
      if (!active) {
        return;
      }

      const L = leaflet.default;
      const defaultIcon = L.Icon.Default.prototype as {
        _getIconUrl?: unknown;
      };
      delete defaultIcon._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      setMapModule({
        MapContainer: reactLeaflet.MapContainer,
        Marker: reactLeaflet.Marker,
        TileLayer: reactLeaflet.TileLayer,
        useMapEvents: reactLeaflet.useMapEvents,
      });
    });

    return () => {
      active = false;
    };
  }, []);

  const center = value ?? DEFAULT_CENTER;

  if (!mapModule) {
    return (
      <div
        className={[styles.map, styles.loading, className]
          .filter(Boolean)
          .join(" ")}
      >
        Loading map…
      </div>
    );
  }

  const { MapContainer, Marker, TileLayer, useMapEvents } = mapModule;

  return (
    <div className={[styles.mapShell, className].filter(Boolean).join(" ")}>
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={value ? 15 : 12}
        className={styles.map ?? ""}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onChange={onChange} useMapEvents={useMapEvents} />
        {value && (
          <Marker
            position={[value.latitude, value.longitude]}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const marker = event.target as {
                  getLatLng: () => { lat: number; lng: number };
                };
                const next = marker.getLatLng();
                onChange({
                  latitude: next.lat,
                  longitude: next.lng,
                });
              },
            }}
          />
        )}
      </MapContainer>
      <p className={styles.hint}>
        {value
          ? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)} · drag the pin or click the map to move it`
          : "Click the map to place this branch"}
      </p>
    </div>
  );
}
