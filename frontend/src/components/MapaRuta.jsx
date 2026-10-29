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

/* Iconos dibujados con CSS y no con imágenes, por lo mismo que el
   pin y el cono: así siempre aparecen y toman los colores del
   proyecto. */
const ICONO_LOCAL = L.divIcon({
  className: 'pin-local',
  html:
    '<span class="local-cuerpo">' +
    '<span class="local-techo"></span>' +
    '<span class="local-puerta"></span>' +
    '</span>',
  iconSize: [32, 34],
  iconAnchor: [16, 34],
  popupAnchor: [0, -32],
})

const ICONO_CONO = L.divIcon({
  className: 'cono-obstaculo',
  html:
    '<span class="cono-cuerpo">' +
    '<span class="cono-banda"></span>' +
    '<span class="cono-banda"></span>' +
    '</span>',
  iconSize: [24, 34],
  iconAnchor: [12, 34],
  popupAnchor: [0, -32],
})


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
  local = null,
  conos = [],
}) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const capa = useRef(null)

  useEffect(() => {
    if (!contenedor.current) {
      return undefined
    }

    const cerrada =
      ruta?.estado === 'COMPLETADA' || ruta?.estado === 'CANCELADA'

    if (cerrada) {
      /* Una ruta cerrada es un registro histórico, no operación en
         curso. No se dibuja en el mapa: la que se ve operativa es la
         que todavía tiene entregas por hacer, y la que ya se hizo se
         cierra a sí misma y se queda como lo que es. */
      if (capa.current) {
        capa.current.remove()
        capa.current = null
      }

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

    /* Trazado de la ruta en orden de visita.

       Si el backend pudo consultar el motor de rutas, `trazado`
       trae la geometría real que sigue las calles. Si no, se une en
       línea recta y se avisa, para no hacer creer que ese tramo
       existe como calle. */
    const paradasUtiles = paradas.filter(
      (p) => p.tipo_parada !== 'DESCANSO'
    )

    const tieneTrazadoReal =
      Array.isArray(ruta?.trazado) && ruta.trazado.length >= 2

    const puntos = tieneTrazadoReal
      ? ruta.trazado.map(([lat, lon]) => [Number(lat), Number(lon)])
      : paradasUtiles.map((p) => [Number(p.latitud), Number(p.longitud)])

    if (puntos.length >= 2) {
      L.polyline(puntos, {
        color: '#059669',
        weight: tieneTrazadoReal ? 5 : 4,
        opacity: tieneTrazadoReal ? 0.9 : 0.55,
        lineJoin: 'round',
        dashArray: tieneTrazadoReal ? null : '7 7',
      }).addTo(grupo)
    }

    if (!tieneTrazadoReal && paradasUtiles.length >= 2) {
      grupo
        .bindTooltip(
          'Trazado estimado: no se pudo consultar el motor de rutas',
          { permanent: true, direction: 'top', className: 'aviso-trazado' }
        )
        .openTooltip()
    }

    // El local de la empresa. Aparece en todos los mapas: es el punto
    // del que salen los envíos y al que vuelven los vehículos de
    // noche, y sin él el mapa no dice de dónde ni a dónde va nada.
    if (
      local &&
      local.latitud !== null &&
      local.latitud !== undefined
    ) {
      L.marker([Number(local.latitud), Number(local.longitud)], {
        icon: ICONO_LOCAL,
        zIndexOffset: 800,
      })
        .bindPopup(
          `<strong>${local.direccion || 'Local de la empresa'}</strong>` +
            '<br/>Punto de partida y de retorno de los envíos'
        )
        .addTo(grupo)
    }

    // Conos de la calzada. Se dibujan como obstáculos aparte de las
    // paradas: un cono no es una entrega, es algo que hay que
    // esquivar, y por eso va en naranja y no en verde.
    ;(conos ?? []).forEach((c) => {
      L.marker([Number(c.latitud), Number(c.longitud)], {
        icon: ICONO_CONO,
        zIndexOffset: 850,
      })
        .bindPopup(
          `<strong>${c.tipo === 'CONO' ? 'Cono' : c.tipo}</strong>` +
            `<br/>${c.descripcion}`
        )
        .addTo(grupo)
    })

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