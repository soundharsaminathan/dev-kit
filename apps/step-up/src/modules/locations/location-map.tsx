import { Icon } from "@dev-ui/icons";
import { useEffect, useState } from "react";
import {
  ExpandableBentoGrid,
  type ExpandableBentoItem,
} from "@/modules/ui/expandable-bento-grid";
import styles from "./location-map.module.scss";
import { mapsUrl } from "./types";

type LocationMapProps = {
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
  className?: string;
};

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
    const frame = requestAnimationFrame(() => map.invalidateSize());
    return () => cancelAnimationFrame(frame);
  }, [map]);
  return null;
}

function MapCanvas({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const [mapModule, setMapModule] = useState<MapModule | null>(cachedModule);

  useEffect(() => {
    let active = true;
    void loadMapModule().then((loaded) => {
      if (active) setMapModule(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!mapModule) {
    return <div className={styles.loading}>Loading map…</div>;
  }

  const { MapContainer, Marker, TileLayer, useMap } = mapModule;

  return (
    <div className={styles.map}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} />
        <MapSizeFix useMap={useMap} />
      </MapContainer>
    </div>
  );
}

export function LocationMap({
  latitude,
  longitude,
  name,
  address,
  className,
}: LocationMapProps) {
  const item: ExpandableBentoItem = {
    id: "location-map",
    title: name,
    subtitle: address ?? "Map and directions",
    ...(address ? { description: address } : {}),
    media: (
      <span className={styles.mediaIcon} aria-hidden>
        <Icon name="map-pin" />
      </span>
    ),
    actionLabel: "Directions",
    onAction: () => {
      window.open(
        mapsUrl(latitude, longitude),
        "_blank",
        "noopener,noreferrer",
      );
    },
    content: (
      <div className={styles.body}>
        <MapCanvas latitude={latitude} longitude={longitude} />
        <a
          className={styles.directions}
          href={mapsUrl(latitude, longitude)}
          target="_blank"
          rel="noreferrer"
        >
          Open directions for {name}
        </a>
      </div>
    ),
  };

  return (
    <section className={[styles.root, className].filter(Boolean).join(" ")}>
      <h2 className={styles.heading}>Location</h2>
      <ExpandableBentoGrid items={[item]} aria-label="Location" />
    </section>
  );
}
