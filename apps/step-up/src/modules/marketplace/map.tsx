import { useEffect, useMemo, useState } from "react";
import { clusterMarketplacePins } from "./place";
import type { MarketplaceMapPin } from "./types";
import styles from "./map.module.scss";

type LeafletNS = typeof import("leaflet");

type MapModule = {
  L: LeafletNS;
  MapContainer: typeof import("react-leaflet").MapContainer;
  Marker: typeof import("react-leaflet").Marker;
  TileLayer: typeof import("react-leaflet").TileLayer;
  useMap: typeof import("react-leaflet").useMap;
  useMapEvents: typeof import("react-leaflet").useMapEvents;
};

let cachedModule: MapModule | null = null;

async function loadMapModule(): Promise<MapModule> {
  if (cachedModule) return cachedModule;
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
    L,
    MapContainer: reactLeaflet.MapContainer,
    Marker: reactLeaflet.Marker,
    TileLayer: reactLeaflet.TileLayer,
    useMap: reactLeaflet.useMap,
    useMapEvents: reactLeaflet.useMapEvents,
  };
  return cachedModule;
}

function pinIcon(L: LeafletNS, count: number, selected: boolean) {
  const clustered = count > 1;
  return L.divIcon({
    className: [
      "mp-pin",
      clustered ? "is-cluster" : "",
      selected ? "is-selected" : "",
    ]
      .filter(Boolean)
      .join(" "),
    html: `<span>${clustered ? count : ""}</span>`,
    iconSize: clustered ? [36, 36] : [22, 22],
    iconAnchor: clustered ? [18, 18] : [11, 11],
    popupAnchor: [0, clustered ? -18 : -11],
    tooltipAnchor: [0, -8],
  });
}

function MapSizeFix({ useMap }: { useMap: MapModule["useMap"] }) {
  const map = useMap();
  useEffect(() => {
    const frame = requestAnimationFrame(() => map.invalidateSize());
    return () => cancelAnimationFrame(frame);
  }, [map]);
  return null;
}

function MapEvents({
  useMapEvents,
  onZoom,
}: {
  useMapEvents: MapModule["useMapEvents"];
  onZoom: (zoom: number) => void;
}) {
  useMapEvents({
    zoomend: (event) => onZoom(event.target.getZoom()),
  });
  return null;
}

function FocusPin({
  useMap,
  pin,
}: {
  useMap: MapModule["useMap"];
  pin: MarketplaceMapPin | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!pin) return;
    map.panTo([pin.lat, pin.lng], { animate: true });
  }, [map, pin]);
  return null;
}

function ExpandCluster({
  useMap,
  target,
}: {
  useMap: MapModule["useMap"];
  target: { lat: number; lng: number; zoom: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.setView([target.lat, target.lng], target.zoom, { animate: true });
  }, [map, target]);
  return null;
}

export function MarketplaceMap({
  pins,
  selectedId,
  onSelect,
}: {
  pins: MarketplaceMapPin[];
  selectedId: string | null;
  onSelect: (pin: MarketplaceMapPin) => void;
}) {
  const [mapModule, setMapModule] = useState<MapModule | null>(cachedModule);
  const [zoom, setZoom] = useState(12);
  const [expand, setExpand] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);
  const selected = pins.find((pin) => pin.id === selectedId) ?? pins[0] ?? null;
  const clusters = useMemo(
    () => clusterMarketplacePins(pins, zoom),
    [pins, zoom],
  );

  useEffect(() => {
    let active = true;
    void loadMapModule().then((loaded) => {
      if (active) setMapModule(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!pins.length) {
    return (
      <div className={styles.empty} data-testid="marketplace-map">
        No mapped floors in this result set.
      </div>
    );
  }

  if (!mapModule) {
    return (
      <div className={styles.loading} data-testid="marketplace-map">
        Loading map…
      </div>
    );
  }

  const { L, MapContainer, Marker, TileLayer, useMap, useMapEvents } =
    mapModule;
  const center = selected ?? pins[0]!;

  return (
    <div className={styles.map} data-testid="marketplace-map">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {clusters.map((cluster) => {
          const pin =
            cluster.pinIds.length === 1
              ? pins.find((item) => item.id === cluster.pinIds[0])
              : undefined;
          const selectedCluster = cluster.pinIds.includes(selectedId ?? "");
          const label = pin
            ? [pin.label, pin.area].filter(Boolean).join(" · ")
            : `${cluster.count} floors`;
          return (
            <Marker
              key={cluster.id}
              position={[cluster.lat, cluster.lng]}
              title={label}
              icon={pinIcon(L, cluster.count, selectedCluster)}
              eventHandlers={{
                click: () => {
                  if (pin) {
                    onSelect(pin);
                    return;
                  }
                  setExpand({
                    lat: cluster.lat,
                    lng: cluster.lng,
                    zoom: Math.min(zoom + 2, 16),
                  });
                },
              }}
            />
          );
        })}
        <FocusPin useMap={useMap} pin={selected} />
        <ExpandCluster useMap={useMap} target={expand} />
        <MapEvents useMapEvents={useMapEvents} onZoom={setZoom} />
        <MapSizeFix useMap={useMap} />
      </MapContainer>
    </div>
  );
}
