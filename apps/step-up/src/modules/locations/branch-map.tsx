import { useEffect, useState } from "react";
import { FormInput } from "@/modules/ui/form-input";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./branch-map.module.scss";
import { isShortMapLink, parseMapLink } from "./parse-map-link";
import type { MapCoordinates } from "./types";

type BranchMapProps = {
  value: MapCoordinates | null;
  onChange: (value: MapCoordinates) => void;
  resolveShortLink?: (url: string) => Promise<string>;
  className?: string;
};

type MapModule = {
  MapContainer: typeof import("react-leaflet").MapContainer;
  Marker: typeof import("react-leaflet").Marker;
  TileLayer: typeof import("react-leaflet").TileLayer;
  useMap: typeof import("react-leaflet").useMap;
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

function RecenterMap({
  value,
  useMap,
}: {
  value: MapCoordinates;
  useMap: MapModule["useMap"];
}) {
  const map = useMap();

  useEffect(() => {
    map.setView([value.latitude, value.longitude], Math.max(map.getZoom(), 15));
  }, [map, value.latitude, value.longitude]);

  return null;
}

export function BranchMap({
  value,
  onChange,
  resolveShortLink,
  className,
}: BranchMapProps) {
  const [mapModule, setMapModule] = useState<MapModule | null>(null);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pinning, setPinning] = useState(false);

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
        useMap: reactLeaflet.useMap,
        useMapEvents: reactLeaflet.useMapEvents,
      });
    });

    return () => {
      active = false;
    };
  }, []);

  async function pinFromLink(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setLinkError("Paste a Google Maps link first");
      return;
    }

    setPinning(true);
    setLinkError(null);

    try {
      let coords = parseMapLink(trimmed);

      if (!coords && isShortMapLink(trimmed)) {
        if (!resolveShortLink) {
          throw new Error(
            "Short links need a full Google Maps URL from the address bar",
          );
        }
        const resolved = await resolveShortLink(trimmed);
        coords = parseMapLink(resolved);
      }

      if (!coords) {
        throw new Error(
          "Couldn’t find coordinates in that link. Open it and copy the full URL.",
        );
      }

      onChange(coords);
      setLink("");
    } catch (error) {
      setLinkError(
        error instanceof Error ? error.message : "Couldn’t pin from that link",
      );
    } finally {
      setPinning(false);
    }
  }

  const center = value ?? DEFAULT_CENTER;

  return (
    <div className={[styles.mapShell, className].filter(Boolean).join(" ")}>
      <div className={styles.linkRow}>
        <div className={styles.linkField}>
          <FormInput
            label="Paste Google Maps link"
            placeholder="https://maps.app.goo.gl/… or full maps URL"
            value={link}
            onChange={(next) => {
              setLink(next);
              if (linkError) setLinkError(null);
            }}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData("text");
              if (!pasted.trim()) return;
              event.preventDefault();
              setLink(pasted);
              void pinFromLink(pasted);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void pinFromLink(link);
              }
            }}
            inputMode="url"
            autoComplete="off"
            data-testid="map-link-input"
          />
        </div>
        <TouchButton
          size="md"
          variant="default"
          onClick={() => void pinFromLink(link)}
          isPending={pinning}
          isDisabled={pinning || !link.trim()}
          data-testid="map-link-pin"
        >
          Pin
        </TouchButton>
      </div>
      {linkError ? <p className={styles.linkError}>{linkError}</p> : null}

      {!mapModule ? (
        <div className={[styles.map, styles.loading].filter(Boolean).join(" ")}>
          Loading map…
        </div>
      ) : (
        (() => {
          const { MapContainer, Marker, TileLayer, useMap, useMapEvents } =
            mapModule;
          return (
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
              <MapClickHandler
                onChange={onChange}
                useMapEvents={useMapEvents}
              />
              {value ? <RecenterMap value={value} useMap={useMap} /> : null}
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
          );
        })()
      )}
      <p className={styles.hint}>
        {value
          ? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)} · drag the pin or click the map to move it`
          : "Paste a Google Maps link to pin quickly, or click the map"}
      </p>
    </div>
  );
}
