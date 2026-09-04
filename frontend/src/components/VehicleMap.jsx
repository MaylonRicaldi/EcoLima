import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix iconos Leaflet en React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/**
 * FIX del bug reportado:
 * Antes:  home_latitude && v.home_longitude && ( <Marker ... position={[v.home_latitude, v.home_longitude]} )
 * Problema 1: falta prefijo v. en home_latitude -> ReferenceError: home_latitude is not defined
 * Problema 2: chequeo con && no valida 0 ni string vacía, mejor usar != null y Number()
 * Problema 3: v.id vs v.id_vehiculo inconsistente con backend ER (usa id_vehiculo)
 * Problema 4: si home_latitude es null (vehículo sin base, RF-01 no lo exige), marker no debe renderizarse pero sin crashear
 */

export default function VehicleMap({ vehicles = [], pedidos = [], center = [-12.046, -77.03], zoom = 12 }) {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height: "500px", width: "100%", borderRadius: 12 }}>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Vehículos - FIX: v.home_latitude con prefijo, validación != null, Number(), key usa id_vehiculo */}
      {vehicles.map((v) =>
        v.home_latitude != null && v.home_longitude != null ? (
          <Marker
            key={`vehicle-${v.id_vehiculo ?? v.id}`}
            position={[Number(v.home_latitude), Number(v.home_longitude)]}
          >
            <Popup>
              <b>{v.placa}</b> - {v.tipo}<br />
              Cap: {v.capacidad_carga_kg ?? v.capacidad_kg} kg<br />
              Consumo: {v.consumo_combustible_km_l ?? v.consumo_km_l} km/L
            </Popup>
          </Marker>
        ) : null
      )}

      {/* Pedidos - defensivo, valida latitud/longitud */}
      {pedidos.map((p) =>
        p.latitud != null && p.longitud != null ? (
          <Marker
            key={`pedido-${p.id_pedido ?? p.id}`}
            position={[Number(p.latitud), Number(p.longitud)]}
          >
            <Popup>
              Pedido #{p.id_pedido ?? p.id}<br />
              {p.direccion_entrega}<br />
              {p.prioridad} - {p.tipo_producto}
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
}

// Ejemplo de uso incorrecto corregido:
// ANTES (bug):
// {vehicles.map(v => home_latitude && v.home_longitude && (
//   <Marker key={`vehicle-${v.id}`} position={[v.home_latitude, v.home_longitude]} />
// ))}
//
// DESPUÉS (fix):
// {vehicles.map(v => v.home_latitude != null && v.home_longitude != null && (
//   <Marker key={`vehicle-${v.id_vehiculo ?? v.id}`} position={[Number(v.home_latitude), Number(v.home_longitude)]} />
// ))}
