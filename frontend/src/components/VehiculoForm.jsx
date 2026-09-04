import { useState } from "react";

// RF-01: Formulario con consumo/factor obligatorios y base opcional para mapa RF-04
// Fix: home_latitude/home_longitude opcionales (no requeridos en RF-01) pero si se envían, se guardan para VehicleMap
import MapPicker from "./MapPicker";
export default function VehiculoForm({ onSubmit }) {
  const [form, setForm] = useState({
    placa: "",
    tipo: "camioneta",
    capacidad_carga_kg: "",
    consumo_combustible_km_l: "",
    factor_emision_co2_kg_km: "",
    anio_fabricacion: new Date().getFullYear(),
    home_latitude: "",
    home_longitude: "",
  });
  const [showHomeMap, setShowHomeMap] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validación: home_latitude/longitude opcionales (fix para VehicleMap)
    const payload = {
      placa: form.placa.trim().toUpperCase(),
      tipo: form.tipo,
      capacidad_carga_kg: parseFloat(form.capacidad_carga_kg),
      consumo_combustible_km_l: parseFloat(form.consumo_combustible_km_l),
      factor_emision_co2_kg_km: parseFloat(form.factor_emision_co2_kg_km),
      anio_fabricacion: parseInt(form.anio_fabricacion, 10),
      ...(form.home_latitude !== "" && form.home_longitude !== ""
        ? { home_latitude: parseFloat(form.home_latitude), home_longitude: parseFloat(form.home_longitude) }
        : {}),
    };

    if (!payload.placa.match(/^[A-Z0-9]{2,3}-[0-9]{3,4}$/)) {
      setError("Placa inválida. Ej: ABC-123");
      return;
    }
    if (payload.consumo_combustible_km_l <= 0 || payload.factor_emision_co2_kg_km <= 0) {
      setError("Consumo y factor de emisión deben ser > 0");
      return;
    }

    try {
      const res = await fetch("/api/vehiculos/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error al registrar");
      }
      const data = await res.json();
      onSubmit?.(data);
      alert(`Vehículo ${data.placa} registrado correctamente`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="vehiculo-form">
      <h2>Registrar Vehículo - Gestión de Flota (RF-01)</h2>

      <label>Placa* <input name="placa" value={form.placa} onChange={handleChange} placeholder="ABC-123" required /></label>

      <label>Tipo* 
        <select name="tipo" value={form.tipo} onChange={handleChange} required>
          <option value="camioneta">Camioneta</option>
          <option value="furgón">Furgón</option>
          <option value="moto">Moto</option>
        </select>
      </label>

      <label>Capacidad carga (kg)* <input type="number" step="0.1" min="1" name="capacidad_carga_kg" value={form.capacidad_carga_kg} onChange={handleChange} required /></label>

      {/* NUEVOS CAMPOS - antes faltaban */}
      <label>Consumo combustible (km/L)* <input type="number" step="0.1" min="0.1" max="100" name="consumo_combustible_km_l" value={form.consumo_combustible_km_l} onChange={handleChange} placeholder="Ej: 10.5" required /></label>
      <small>Ej: Moto 35-45 km/L, Camioneta 8-12 km/L, Furgón 6-9 km/L</small>

      <label>Factor emisión CO₂ (kgCO₂/km)* <input type="number" step="0.01" min="0.01" max="0.99" name="factor_emision_co2_kg_km" value={form.factor_emision_co2_kg_km} onChange={handleChange} placeholder="Ej: 0.22" required /></label>
      <small>Diésel típico 0.21-0.28 kgCO₂/km. A mayor antigüedad, mayor factor.</small>

      <label>Año fabricación* <input type="number" min="1990" max="2026" name="anio_fabricacion" value={form.anio_fabricacion} onChange={handleChange} required /></label>

      {/* Base operativa opcional para mapa - FIX home_latitude bug */}
      <fieldset style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
        <legend>Base operativa (opcional) - para mapa RF-04</legend>
        <small style={{ color: "#666" }}>No requerido en RF-01. Si se deja vacío, el vehículo no aparecerá como Marker hasta asignar base.</small>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <label>home_latitude <input type="number" step="0.000001" name="home_latitude" value={form.home_latitude} onChange={handleChange} placeholder="-12.006" /></label>
          <label>home_longitude <input type="number" step="0.000001" name="home_longitude" value={form.home_longitude} onChange={handleChange} placeholder="-77.012" /></label>
        </div>
        <button type="button" onClick={() => setShowHomeMap((v) => !v)} style={{ marginTop: 8, padding: "6px 10px", border: "1px solid #ccc", borderRadius: 6, cursor: "pointer" }}>
          {showHomeMap ? "Ocultar mapa" : "Elegir en mapa"}
        </button>
        {showHomeMap && (
          <div style={{ marginTop: 8 }}>
            <MapPicker
              lat={form.home_latitude !== "" ? parseFloat(form.home_latitude) : -12.006}
              lon={form.home_longitude !== "" ? parseFloat(form.home_longitude) : -77.012}
              onChange={({ lat, lon }) => setForm((p) => ({ ...p, home_latitude: lat.toFixed(6), home_longitude: lon.toFixed(6) }))}
              height="220px"
            />
            <small>Click o arrastra el marcador para fijar la base.</small>
          </div>
        )}
      </fieldset>

      {error && <p className="error">{error}</p>}
      <button type="submit">Registrar vehículo</button>
    </form>
  );
}
