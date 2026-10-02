import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'


/* Centro de San Juan de Lurigancho, sede de DistriRápido S.A.C. */
const CENTRO_LIMA = [-12.015, -77.005]

const COLOR_ESTADO_PARADA = {
  INICIO: '#10b981',
  FIN: '#be123c',
  DESCANSO: '#f59e0b',
  REPOSTAJE: '#a78bfa',
  ENTREGA: '#0ea5e9',
}

const COLOR_ENTREGA = {
  PENDIENTE: '#f59e0b',
  ENTREGADO: '#10b981',
  FALLIDO: '#be123c',
  REPROGRAMADO: '#a78bfa',
}


/**
 * Mapa de rutas con Leaflet + OpenStreetMap (HU-07).
 *
 * Muestra únicamente la información que devuelve el backend: las
 * paradas y pedidos pertenecen a rutas realmente generadas por el
 * optimizador (HU-06). No se dibujan rutas ficticias.
 */
export default function MapaRuta({
  ruta,
  pedidos,
  trafico = [],
  incidentes = [],
  altura = '26rem',
}) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const capa = useRef(null)

  useEffect(() => {
    if (!contenedor.current) {
      return undefined
    }

    if (!mapa.current) {
      mapa.current = L.map(contenedor.current, {
        center: CENTRO_LIMA,
        zoom: 12,
        scrollWheelZoom: false,
      })

      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }
      ).addTo(mapa.current)
    }

    const m = mapa.current

    if (capa.current) {
      capa.current.remove()
      capa.current = null
    }

    const grupo = L.featureGroup().addTo(m)

    const paradas = ruta?.paradas ?? []

    // Trazado de la ruta en orden de visita
    const puntos = paradas
      .filter((p) => p.tipo_parada !== 'DESCANSO')
      .map((p) => [Number(p.latitud), Number(p.longitud)])

    if (puntos.length >= 2) {
      L.polyline(puntos, {
        color: '#059669',
        weight: 4,
        opacity: 0.85,
        lineJoin: 'round',
      }).addTo(grupo)
    }

    // Marcadores de cada parada
    paradas.forEach((p) => {
      const color =
        COLOR_ESTADO_PARADA[p.tipo_parada] ?? '#0ea5e9'

      L.circleMarker([Number(p.latitud), Number(p.longitud)], {
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.95,
      })
        .bindPopup(
          `<strong>${p.tipo_parada}</strong><br/>` +
            `Orden: ${p.orden}<br/>` +
            `Llegada estimada: ${
              p.hora_llegada_estimada
                ? new Date(
                    p.hora_llegada_estimada
                  ).toLocaleTimeString('es-PE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-'
            }<br/>` +
            `Espera: ${p.tiempo_espera ?? 0} min`
        )
        .addTo(grupo)
    })

    // Pedidos con su estado de entrega
    ;(pedidos ?? []).forEach((p) => {
      const color = COLOR_ENTREGA[p.estado_entrega] ?? '#0ea5e9'

      L.marker([Number(p.latitud), Number(p.longitud)], {
        icon: L.divIcon({
          className: 'pin-entrega',
          html:
            `<span style="background:${color}">${p.orden_visita}</span>`,
          iconSize: [26, 26],
          iconAnchor: [13, 26],
          popupAnchor: [0, -26],
        }),
      })
        .bindPopup(
          `<strong>Pedido ${p.id_pedido}</strong><br/>` +
            `${p.cliente_nombre ?? ''}<br/>` +
            `${p.direccion_entrega}<br/>` +
            `${p.peso_kg} kg / ${p.volumen_m3} m³<br/>` +
            `Prioridad: ${p.prioridad}<br/>` +
            `Estado: ${p.estado_entrega}` +
            (Number(p.penalizacion) > 0
              ? `<br/>Penalización: S/ ${p.penalizacion}`
              : '')
        )
        .addTo(grupo)
    })

    // Tramos de tráfico (RF-04: nivel de congestión)
    trafico.forEach((t) => {
      const color =
        t.nivel_congestion === 'ROJO'
          ? '#be123c'
          : t.nivel_congestion === 'AMARILLO'
            ? '#f59e0b'
            : '#10b981'

      L.circle([Number(t.latitud), Number(t.longitud)], {
        radius: 320,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.18,
      })
        .bindPopup(
          `<strong>${t.segmento}</strong><br/>` +
            `Congestión: ${t.nivel_congestion}<br/>` +
            (t.velocidad_kmh
              ? `Velocidad: ${t.velocidad_kmh} km/h<br/>`
              : '') +
            `Fuente: ${t.fuente}`
        )
        .addTo(grupo)
    })

    // Incidentes activos
    incidentes.forEach((i) => {
      L.circleMarker(
        [Number(i.latitud), Number(i.longitud)],
        {
          radius: 9,
          color: '#ffffff',
          weight: 2,
          fillColor: '#be123c',
          fillOpacity: 0.95,
        }
      )
        .bindPopup(
          `<strong>${i.tipo}</strong><br/>${i.descripcion}<br/>` +
            `Nivel: ${i.nivel}`
        )
        .addTo(grupo)
    })

    capa.current = grupo

    if (grupo.getLayers().length > 0) {
      m.fitBounds(grupo.getBounds(), {
        padding: [40, 40],
        maxZoom: 16,
      })
    }

    return undefined
  }, [ruta, pedidos, trafico, incidentes])

  useEffect(() => {
    const m = mapa.current

    if (!m) {
      return undefined
    }

    const alRedimensionar = () => m.invalidateSize()

    window.addEventListener('resize', alRedimensionar)

    return () => {
      window.removeEventListener('resize', alRedimensionar)
    }
  }, [])

  useEffect(
    () => () => {
      if (mapa.current) {
        mapa.current.remove()
        mapa.current = null
      }
    },
    []
  )

  return (
    <div
      ref={contenedor}
      className="mapa-ruta"
      style={{ height: altura }}
      aria-label="Mapa de la ruta"
    />
  )
}