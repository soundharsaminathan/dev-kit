import { useEffect, useState } from "react";
import styles from "./cards.module.scss";
import type { ChatLocation } from "./types";

type MapModule = {
  MapContainer: typeof import("react-leaflet").MapContainer;
  Marker: typeof import("react-leaflet").Marker;
  TileLayer: typeof import("react-leaflet").TileLayer;
  useMap: typeof import("react-leaflet").useMap;
};

let cachedModule: MapModule | null = null;

async function loadMapModule(): Promise<MapModule> {
  if (cachedModule) {
    return cachedModule;
  }
  const [, leaflet, reactLeaflet] = await Promise.all([
    import("leaflet/dist/leaflet.css"),
    import("leaflet"),
    import("react-leaflet"),
  ]);

  const L = leaflet.default;
  const defaultIcon = L.Icon.Default.prototype as { _getIconUrl?: unknown };
  delete defaultIcon._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });

  cachedModule = {
    MapContainer: reactLeaflet.MapContainer,
    Marker: reactLeaflet.Marker,
    TileLayer: reactLeaflet.TileLayer,
    useMap: reactLeaflet.useMap,
  };
  return cachedModule;
}

function MapSizeFix({ useMap }: { useMap: MapModule["useMap"] }) {
  const map = useMap();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      map.invalidateSize();
    });
    return () => cancelAnimationFrame(frame);
  }, [map]);

  return null;
}

export function LocationCard({ location }: { location: ChatLocation }) {
  const [mapModule, setMapModule] = useState<MapModule | null>(cachedModule);
  const label = location.label || "Shared location";
  const mapsUrl = `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=16/${location.lat}/${location.lng}`;

  useEffect(() => {
    let active = true;
    void loadMapModule().then((loaded) => {
      if (active) {
        setMapModule(loaded);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (!mapModule) {
    return <div className={styles.mapLoading}>Loading map…</div>;
  }

  const { MapContainer, Marker, TileLayer, useMap } = mapModule;

  return (
    <div className={styles.map}>
      <MapContainer
        center={[location.lat, location.lng]}
        zoom={15}
        {...(styles.mapCanvas ? { className: styles.mapCanvas } : {})}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        attributionControl={false}
      >
        <MapSizeFix useMap={useMap} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[location.lat, location.lng]} />
      </MapContainer>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className={styles.mapHit}
        aria-label={`Open ${label} in maps`}
      >
        <span className={styles.mapScrim}>
          <span className={styles.mapLabel}>{label}</span>
          <span className={styles.mapHint}>Tap to open maps</span>
        </span>
      </a>
    </div>
  );
}
