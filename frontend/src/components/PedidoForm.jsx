import { useState, useEffect, useRef } from "react";
import MapPicker from "./MapPicker";

// RF-02: Gestión de Pedidos - Orden exacto solicitado
// 1. ID cliente (primero, no nombre)
// 2. Dirección entrega
// 3. Coordenadas GPS con 2 opciones profesionales: autocomplete + mapa modal
// 4. Peso kg, Volumen m3
// 5. Ventana tiempo inicio-fin (manual HH:MM)
// 6. Prioridad (express, estándar, económico)
// 7. Tipo producto (perecedero, no perecedero)

const LIMA_VIEWBOX = "-77.2,-11.8,-76.8,-12.3"; // lon_min, lat_max, lon_max, lat_min para bounded
const DEFAULT_CENTER = { lat: -12.006, lon: -77.012 }; // SJL aprox

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

async function searchNominatim(query) {
  if (!query || query.trim().length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=pe&q=${encodeURIComponent(query)}&viewbox=${LIMA_VIEWBOX}&bounded=1`;
  try {
    const res = await fetch(url, { headers: { "Accept-Language": "es" } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((d) => ({
      display: d.display_name,
      lat: parseFloat(d.lat),
      lon: parseFloat(d.lon),
      importance: d.importance,
    }));
  } catch {
    return [];
  }
}

export default function PedidoForm({ onSubmit, onSuccess }) {
  // 1. ID cliente primero
  const [form, setForm] = useState({
    cliente_id: "",
    direccion_entrega: "",
    punto_referencia: "",
    latitud: DEFAULT_CENTER.lat,
    longitud: DEFAULT_CENTER.lon,
    peso_kg: "",
    volumen_m3: "",
    ventana_inicio: "08:00",
    ventana_fin: "12:00",
    prioridad: "estándar",
    tipo_producto: "no perecedero",
  });

  const [gpsMode, setGpsMode] = useState("autocomplete"); // autocomplete | modal
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalResults, setModalResults] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useDebounce(searchText, 500);
  const debouncedModalSearch = useDebounce(modalSearch, 500);

  // Opción 1: Autocomplete que mueve el mapa según escribe
  useEffect(() => {
    if (gpsMode !== "autocomplete") return;
    let active = true;
    async function run() {
      if (!debouncedSearch || debouncedSearch.trim().length < 3) {
        setResults([]);
        return;
      }
      setSearching(true);
      const r = await searchNominatim(debouncedSearch);
      if (!active) return;
      setResults(r);
      // Si hay resultado, mover mapa al primero automáticamente (preview profesional)
      if (r.length > 0) {
        setForm((prev) => ({ ...prev, latitud: r[0].lat, longitud: r[0].lon }));
      }
      setSearching(false);
    }
    run();
    return () => { active = false; };
  }, [debouncedSearch, gpsMode]);

  // Modal search
  useEffect(() => {
    if (!showModal) return;
    let active = true;
    async function run() {
      if (!debouncedModalSearch || debouncedModalSearch.trim().length < 3) {
        setModalResults([]);
        return;
      }
      const r = await searchNominatim(debouncedModalSearch);
      if (!active) return;
      setModalResults(r);
    }
    run();
    return () => { active = false; };
  }, [debouncedModalSearch, showModal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMapChange = ({ lat, lon }) => {
    setForm((prev) => ({ ...prev, latitud: lat, longitud: lon }));
  };

  const selectResult = (item) => {
    setForm((p) => ({ ...p, latitud: item.lat, longitud: item.lon, direccion_entrega: p.direccion_entrega || item.display }));
    setSearchText(item.display);
    setResults([]);
  };

  const selectModalResult = (item) => {
    setForm((p) => ({ ...p, latitud: item.lat, longitud: item.lon }));
    setModalSearch(item.display);
    setModalResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validaciones Lima
    if (!form.cliente_id.trim()) {
      setError("ID de cliente es obligatorio (no nombre)");
      return;
    }
    if (form.direccion_entrega.trim().length < 5) {
      setError("Dirección muy corta. Incluya punto de referencia si es zona sin nomenclatura (SJL)");
      return;
    }
    if (form.peso_kg <= 0 || form.volumen_m3 <= 0) {
      setError("Peso y volumen deben ser > 0");
      return;
    }
    if (form.ventana_fin <= form.ventana_inicio) {
      setError("Hora fin debe ser posterior a hora inicio");
      return;
    }

    const payload = {
      cliente_id: form.cliente_id.trim(),
      direccion_entrega: form.direccion_entrega.trim(),
      punto_referencia: form.punto_referencia.trim() || null,
      latitud: parseFloat(form.latitud),
      longitud: parseFloat(form.longitud),
      peso_kg: parseFloat(form.peso_kg),
      volumen_m3: parseFloat(form.volumen_m3),
      ventana_inicio: form.ventana_inicio,
      ventana_fin: form.ventana_fin,
      prioridad: form.prioridad,
      tipo_producto: form.tipo_producto,
    };

    setLoading(true);
    try {
      const res = await fetch("/api/pedidos/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ? JSON.stringify(err.detail) : `Error ${res.status}`);
      }
      const data = await res.json();
      onSuccess?.(data);
      onSubmit?.(data);
      alert(`Pedido ${data.id} registrado para cliente ${data.cliente_id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h2>Registrar Pedido - RF-02</h2>
      <p style={{ color: "#555", fontSize: 14 }}>
        Consigna: ID cliente, dirección con referencia (SJL), GPS dual (autocomplete + mapa), peso, volumen, ventana manual, prioridad y tipo.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        {/* 1. ID CLIENTE PRIMERO */}
        <label><b>1. ID del cliente*</b> <span style={{ fontWeight: 400, color: "#666" }}>(no nombre)</span>
          <input name="cliente_id" value={form.cliente_id} onChange={handleChange} placeholder="Ej: CLI-001, BODEGA-SJL-042, 72699993" required style={{ width: "100%", padding: 8 }} />
        </label>

        {/* 2. DIRECCION */}
        <label><b>2. Dirección de entrega*</b>
          <textarea name="direccion_entrega" value={form.direccion_entrega} onChange={handleChange} placeholder="Av. Próceres 1234, SJL - Altura cuadra 20, Mz C, Lote 5" rows={2} required style={{ width: "100%", padding: 8 }} />
          <small style={{ color: "#666" }}>Soporta direcciones sin nomenclatura estándar + punto de referencia abajo.</small>
        </label>

        <label>Punto de referencia (opcional)
          <input name="punto_referencia" value={form.punto_referencia} onChange={handleChange} placeholder="Ej: frente a bodega 'El Ahorro', a 2 cuadras del mercado" style={{ width: "100%", padding: 8 }} />
        </label>

        {/* 3. COORDENADAS GPS - 2 OPCIONES PROFESIONALES */}
        <fieldset style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
          <legend><b>3. Coordenadas GPS*</b></legend>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button type="button" onClick={() => setGpsMode("autocomplete")} style={{ flex: 1, padding: 8, background: gpsMode === "autocomplete" ? "#0a7d3a" : "#eee", color: gpsMode === "autocomplete" ? "#fff" : "#333", border: 0, borderRadius: 6, cursor: "pointer" }}>Opción 1: Escribir ubicación (autocomplete + mapa)</button>
            <button type="button" onClick={() => setShowModal(true)} style={{ flex: 1, padding: 8, background: "#0a58ca", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer" }}>Opción 2: Abrir mapa interactivo</button>
          </div>

          {gpsMode === "autocomplete" && (
            <div>
              <label>Buscar dirección (escribe y el mapa se mueve)
                <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Escribe: Av. Próceres, SJL, mercado Santa Anita..." style={{ width: "100%", padding: 8 }} />
              </label>
              {searching && <small>Buscando en Lima (OSM/Nominatim)...</small>}
              {results.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, border: "1px solid #ddd", borderRadius: 6, maxHeight: 140, overflowY: "auto", margin: "4px 0" }}>
                  {results.map((r, i) => (
                    <li key={i} onClick={() => selectResult(r)} style={{ padding: "6px 8px", cursor: "pointer", borderBottom: "1px solid #eee", fontSize: 13 }}>{r.display}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <label>Latitud* <input type="number" step="0.000001" name="latitud" value={form.latitud} onChange={handleChange} required style={{ width: "100%", padding: 8 }} /></label>
            <label>Longitud* <input type="number" step="0.000001" name="longitud" value={form.longitud} onChange={handleChange} required style={{ width: "100%", padding: 8 }} /></label>
          </div>
          <small style={{ color: "#666" }}>Vista previa se actualiza al escribir (Opción 1) o al seleccionar en el mapa.</small>

          <div style={{ marginTop: 8 }}>
            <MapPicker lat={parseFloat(form.latitud)} lon={parseFloat(form.longitud)} onChange={handleMapChange} height="280px" />
            <small style={{ color: "#666" }}>Arrastra el marcador o haz clic en el mapa para ajustar. Zona operativa: SJL, El Agustino, Santa Anita, Ate.</small>
          </div>
        </fieldset>

        {/* Modal mapa grande */}
        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 900, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Seleccionar ubicación en mapa</h3>
                <button type="button" onClick={() => setShowModal(false)} style={{ border: 0, background: "#eee", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>Cerrar ✕</button>
              </div>
              <div style={{ padding: 12, display: "grid", gap: 8 }}>
                <input value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} placeholder="Buscar: escribe dirección y selecciona..." style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 6 }} />
                {modalResults.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, border: "1px solid #ddd", borderRadius: 6, maxHeight: 120, overflowY: "auto" }}>
                    {modalResults.map((r, i) => (
                      <li key={i} onClick={() => selectModalResult(r)} style={{ padding: "6px 8px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #eee" }}>{r.display}</li>
                    ))}
                  </ul>
                )}
                <MapPicker lat={parseFloat(form.latitud)} lon={parseFloat(form.longitud)} onChange={handleMapChange} height="420px" />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <span style={{ flex: 1, alignSelf: "center", fontSize: 13, color: "#555" }}>Lat: {Number(form.latitud).toFixed(6)} | Lon: {Number(form.longitud).toFixed(6)}</span>
                  <button type="button" onClick={() => setShowModal(false)} style={{ padding: "10px 18px", background: "#0a7d3a", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer" }}>Confirmar ubicación</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. PESO Y VOLUMEN */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label><b>4. Peso (kg)*</b> <input type="number" step="0.1" min="0.1" max="5000" name="peso_kg" value={form.peso_kg} onChange={handleChange} placeholder="Ej: 12.5" required style={{ width: "100%", padding: 8 }} /></label>
          <label><b>Volumen (m³)*</b> <input type="number" step="0.01" min="0.01" max="30" name="volumen_m3" value={form.volumen_m3} onChange={handleChange} placeholder="Ej: 0.8" required style={{ width: "100%", padding: 8 }} /></label>
        </div>

        {/* 5. VENTANA TIEMPO MANUAL */}
        <fieldset style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <legend><b>5. Ventana de tiempo de entrega* (manual HH:MM)</b></legend>
          <label>Hora inicio* <input type="time" name="ventana_inicio" value={form.ventana_inicio} onChange={handleChange} required style={{ width: "100%", padding: 8 }} /></label>
          <label>Hora fin* <input type="time" name="ventana_fin" value={form.ventana_fin} onChange={handleChange} required style={{ width: "100%", padding: 8 }} /></label>
          <small style={{ gridColumn: "1 / span 2", color: "#666" }}>Puedes escribir manualmente o usar el selector. Fin debe ser posterior a inicio.</small>
        </fieldset>

        {/* 6. PRIORIDAD */}
        <label><b>6. Prioridad*</b>
          <select name="prioridad" value={form.prioridad} onChange={handleChange} required style={{ width: "100%", padding: 8 }}>
            <option value="express">Express</option>
            <option value="estándar">Estándar</option>
            <option value="económico">Económico</option>
          </select>
        </label>

        {/* 7. TIPO PRODUCTO */}
        <label><b>7. Tipo de producto*</b>
          <select name="tipo_producto" value={form.tipo_producto} onChange={handleChange} required style={{ width: "100%", padding: 8 }}>
            <option value="perecedero">Perecedero</option>
            <option value="no perecedero">No perecedero</option>
          </select>
        </label>

        {error && <p style={{ color: "#b00020", background: "#fdd", padding: 8, borderRadius: 6 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: "12px 18px", background: loading ? "#888" : "#0a7d3a", color: "#fff", border: 0, borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", fontWeight: 600 }}>
          {loading ? "Registrando..." : "Registrar pedido"}
        </button>
      </form>
    </div>
  );
}
