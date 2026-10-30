import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/* Centro de San Juan de Lurigancho */
const CENTRO = [-12.015, -77.005]

/* RN-011: el servicio opera dentro de Lima Metropolitana */
const LIMITE = {
  latMin: -12.4,
  latMax: -11.9,
  lonMin: -77.2,
  lonMax: -76.7,
}

function dentroDeLima(lat, lon) {
  return (
    lat >= LIMITE.latMin &&
    lat <= LIMITE.latMax &&
    lon >= LIMITE.lonMin &&
    lon <= LIMITE.lonMax
  )
}


/**
 * Elige un punto sobre el mapa. Nunca se escriben coordenadas a mano.
 *
 * Sirve para el local de la empresa, un tramo de tráfico o un
 * incidente: en los tres casos el usuario marca el sitio en el mapa
 * y el punto queda fijado. Si además se le pasan capas, las dibuja
 * de fondo: así el incidente se reporta sobre su propia ruta y no
 * sobre un mapa en blanco.
 */
export default function SelectorPunto({
  latitud,
  longitud,
  onCambio,
  alto = '18rem',
  etiqueta = 'Punto',
  capas = [],
  marcadores = [],
}) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const capaBase = useRef(null)
  const capaLocal = useRef(null)
  const marcador = useRef(null)

  const hayCoordenada =
    latitud !== '' &&
    longitud !== '' &&
    latitud !== null &&
    longitud !== undefined &&
    !Number.isNaN(Number(latitud)) &&
    !Number.isNaN(Number(longitud))

  useEffect(() => {
    if (!contenedor.current || mapa.current) {
      return undefined
    }

    const m = L.map(contenedor.current, {
      center: hayCoordenada
        ? [Number(latitud), Number(longitud)]
        : CENTRO,
      zoom: hayCoordenada ? 16 : 12,
    })

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    ).addTo(m)

    capaBase.current = L.layerGroup().addTo(m)
    capaLocal.current = L.layerGroup().addTo(m)

    mapa.current = m

    return () => {
      capaLocal.current?.clearLayers()
      capaBase.current?.clearLayers()

      m.remove()

      mapa.current = null
      capaBase.current = null
      capaLocal.current = null
      marcador.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* El marcador del punto elegido */
  useEffect(() => {
    const m = mapa.current

    if (!m || !hayCoordenada) {
      return
    }

    const pos = [Number(latitud), Number(longitud)]

    if (marcador.current) {
      if (marcador.current._map !== m) {
        marcador.current._map?.removeLayer(marcador.current)
        marcador.current = null
      }
    }

    const esNuevo = !marcador.current

    if (esNuevo) {
      marcador.current = L.marker(pos, {
        draggable: true,
        zIndexOffset: 900,
      })
        .on('dragend', (e) => {
          const p = e.target.getLatLng()

          avisar(p.lat, p.lng)
        })
        .bindPopup(etiqueta)

      marcador.current.addTo(capaLocal.current)
    }

    marcador.current.setLatLng(pos)

    /* Sólo se recentra cuando el punto acaba de aparecer. Si se
       recentrara en cada cambio, el mapa se movería justo debajo
       del cursor después de cada clic: el usuario vería el punto
       saltar a otro sitio del que tocó. */
    if (esNuevo) {
      m.setView(pos)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitud, longitud])

  function avisar(la, lo) {
    onCambio?.({
      latitud: Number(Number(la).toFixed(7)),
      longitud: Number(Number(lo).toFixed(7)),
    })
  }

  /* Las capas de fondo: las rutas que se le pasen. Se redibujan
     cuando llegan, porque si no se limpian se acumulan trazos. */
  useEffect(() => {
    const capa = capaBase.current

    if (!capa) {
      return
    }

    capa.clearLayers()

    /* Los límites se llevan a mano. Un layerGroup es sólo un
       contenedor de capas: no sabe calcular un rectángulo, y
       pedirle getBounds reventaba la pantalla entera con
       "capa.getBounds is not a function". */
    const limites = L.latLngBounds([])

    for (const ruta of capas) {
      const puntos = (ruta.paradas || [])
        .filter((p) => p.tipo_parada !== 'DESCANSO')
        .map((p) => [Number(p.latitud), Number(p.longitud)])

      if (puntos.length >= 2) {
        L.polyline(puntos, {
          color: ruta.color || '#059669',
          weight: 5,
          opacity: 0.85,
          lineJoin: 'round',
        }).addTo(capa)

        limites.extend(puntos)
      }

      const entregas = ruta.paradas || []

      for (const p of entregas) {
        if (p.tipo_parada !== 'ENTREGA') {
          continue
        }

        limites.extend([Number(p.latitud), Number(p.longitud)])

        L.circleMarker([Number(p.latitud), Number(p.longitud)], {
          radius: 6,
          color: ruta.color || '#059669',
          fillColor: '#ffffff',
          fillOpacity: 1,
          weight: 2,
        })
          .bindPopup(`<strong>${ruta.identificador}</strong>`)
          .addTo(capa)
      }
    }

    /* Los incidentes y conos ya reportados. Se dibujan junto a las
       rutas para que, en cuanto se registra uno, se vea en el mismo
       mapa en el que se está marcando: si el reporte sólo apareciera
       en una tabla debajo, habría que confiar en que salió bien. */
    for (const m of marcadores) {
      const pos = [Number(m.latitud), Number(m.longitud)]

      if (Number.isNaN(pos[0]) || Number.isNaN(pos[1])) {
        continue
      }

      limites.extend(pos)

      L.circleMarker(pos, {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: m.color || '#be123c',
        fillOpacity: 0.95,
      })
        .bindPopup(
          `<strong>${m.tipo || m.titulo || 'Aviso'}</strong><br/>` +
            `${m.descripcion || ''}` +
            (m.nivel ? `<br/>Nivel: ${m.nivel}` : '')
        )
        .addTo(capa)
    }

    /* Ajusta la vista para que quepa todo lo dibujado. Si sólo hay
       un punto, bounds.extend no produce un rectángulo válido y
       fitBounds falla, así que se centra sin zoom. */
    if (limites.isValid()) {
      if (limites.getNorthEast().equals(limites.getSouthWest())) {
        mapa.current.setView(limites.getCenter(), 15)
      } else {
        mapa.current.fitBounds(limites, { padding: [30, 30] })
      }
    }
  }, [capas, marcadores])

  /* El clic marca el punto. Se registra en un efecto aparte para
     que siga funcionando si el mapa llegara a recrearse. */
  useEffect(() => {
    const m = mapa.current

    if (!m) {
      return undefined
    }

    const alPulsar = (e) => {
      const la = e.latlng.lat
      const lo = e.latlng.lng

      if (!dentroDeLima(la, lo)) {
        return
      }

      avisar(la, lo)
    }

    m.on('click', alPulsar)

    return () => {
      m.off('click', alPulsar)
    }
  }, [onCambio, avisar])

  return (
    <div className="selector-punto">
      <div
        ref={contenedor}
        className="mapa-ubicador"
        style={{ height: alto }}
        aria-label={`Mapa para elegir ${etiqueta.toLowerCase()}`}
      />

      <div className="coordenadas-elegidas">
        <span>
          <strong>Latitud:</strong>{' '}
          {hayCoordenada ? Number(latitud) : 'sin elegir'}
        </span>

        <span>
          <strong>Longitud:</strong>{' '}
          {hayCoordenada ? Number(longitud) : 'sin elegir'}
        </span>

        {!hayCoordenada && (
          <span className="coordenadas-pista">
            Haga clic en el mapa
          </span>
        )}
      </div>
    </div>
  )
}