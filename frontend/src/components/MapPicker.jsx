import { useEffect, useRef } from "react";

// Carga Leaflet dinámicamente para evitar errores SSR
let L = null;
async function loadLeaflet() {
  if (L) return L;
  if (typeof window === "undefined") return null;
  // Asegurar CSS
  if (!document.querySelector('link[href*="leaflet.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
  const mod = await import("leaflet");
  L = mod.default || mod;
  // Fix icon
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
  return L;
}

export default function MapPicker({ lat, lon, onChange, height = "300px" }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const leaflet = await loadLeaflet();
      if (cancelled || !leaflet || !mapRef.current) return;
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
      const center = [lat || -12.0432, lon || -77.0282]; // Lima - SJL por defecto
      const map = leaflet.map(mapRef.current).setView(center, 13);
      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = leaflet.marker(center, { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChange?.({ lat: pos.lat, lon: pos.lng, source: "drag" });
      });

      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        onChange?.({ lat: e.latlng.lat, lon: e.latlng.lng, source: "click" });
      });

      mapInstance.current = map;
    }
    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualizar marcador cuando props cambian (ej: búsqueda autocomplete)
  useEffect(() => {
    if (mapInstance.current && markerRef.current && lat != null && lon != null) {
      const newPos = [lat, lon];
      markerRef.current.setLatLng(newPos);
      mapInstance.current.setView(newPos, mapInstance.current.getZoom());
    }
  }, [lat, lon]);

  return <div ref={mapRef} style={{ height, width: "100%", borderRadius: "8px", border: "1px solid #ddd" }} />;
}
