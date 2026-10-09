import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/* Centro de San Juan de Lurigancho, sede de DistriRápido S.A.C. */
const CENTRO = [-12.015, -77.005]

/* RN-011: bounding box de Lima Metropolitana.
   El DDL es más amplio (lat -13..-11, lon -78..-76) y el backend lo
   valida; aquí se usa el box de Lima para acotar la búsqueda. */
const LIMITE = {
  latMin: -12.4,
  latMax: -11.9,
  lonMin: -77.2,
  lonMax: -76.7,
}

/* Geocodificación de OpenStreetMap (Nominatim).
   No requiere clave de API. */
const NOMINATIM =
  'https://nominatim.openstreetmap.org/search' +
  '?format=jsonv2&limit=6&addressdetails=1&countrycodes=pe'

/* Política de uso de Nominatim: máximo 1 petición por segundo.
   Por eso se espera antes de cada consulta, aunque el usuario
   escriba más rápido. */
const ESPERA_MINIMA_MS = 1100
const ESPERA_ESCRITURA_MS = 550

const MIN_CARACTERES = 3


function dentroDeLima(lat, lon) {
  return (
    lat >= LIMITE.latMin &&
    lat <= LIMITE.latMax &&
    lon >= LIMITE.lonMin &&
    lon <= LIMITE.lonMax
  )
}


/**
 * Selector de ubicación sobre mapa (HU-05 / RF-02 / RN-011).
 *
 * Tres formas de elegir el punto:
 *   1. Buscador con sugerencias mientras se escribe.
 *   2. Clic sobre el mapa.
 *   3. Arrastrar el marcador.
 *
 * `onCambio` se llama únicamente al confirmar un punto (elegir una
 * sugerencia, hacer clic o soltar el marcador). Nunca mientras se
 * escribe, para que un fallo del buscador no altere el formulario.
 *
 * No renderiza ningún <form>: se usa dentro del formulario de la
 * página y los <form> no se pueden anidar.
 */
export default function MapaUbicador({
  latitud,
  longitud,
  onCambio,
  altura = '20rem',
}) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const marcador = useRef(null)

  const temporizador = useRef(null)
  const peticion = useRef(null)
  const ultimaPeticion = useRef(0)

  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [sugerencias, setSugerencias] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(-1)
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState('')

  const hayCoordenada =
    latitud !== '' &&
    longitud !== '' &&
    !Number.isNaN(Number(latitud)) &&
    !Number.isNaN(Number(longitud))

  /* Fija el punto: mueve el marcador y avisa al formulario.
     Se declara antes de los efectos que la usan. */
  const fijar = (lat, lon, etiqueta = '') => {
    const redondeadoLat = Number(Number(lat).toFixed(7))
    const redondeadoLon = Number(Number(lon).toFixed(7))

    if (!dentroDeLima(redondeadoLat, redondeadoLon)) {
      setAviso(
        'La ubicación está fuera del área de Lima. ' +
          'Ajústela dentro del distrito.'
      )
    } else {
      setAviso('')
    }

    if (marcador.current) {
      marcador.current.setLatLng([redondeadoLat, redondeadoLon])
    }

    if (mapa.current) {
      mapa.current.setView([redondeadoLat, redondeadoLon])
    }

    onCambio({
      latitud: redondeadoLat,
      longitud: redondeadoLon,
      etiqueta,
    })
  }

  /* ---------------- mapa ---------------- */

  useEffect(() => {
    if (!contenedor.current || mapa.current) {
      return undefined
    }

    mapa.current = L.map(contenedor.current, {
      center: hayCoordenada
        ? [Number(latitud), Number(longitud)]
        : CENTRO,
      zoom: 13,
    })

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    ).addTo(mapa.current)

    mapa.current.on('click', (e) => {
      fijar(e.latlng.lat, e.latlng.lng)
    })

    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------------- marcador ---------------- */

  useEffect(() => {
    if (!mapa.current) {
      return
    }

    if (hayCoordenada) {
      const pos = [Number(latitud), Number(longitud)]

      if (marcador.current) {
        marcador.current.setLatLng(pos)
      } else {
        marcador.current = L.marker(pos, { draggable: true })
          .addTo(mapa.current)
          .on('dragend', (e) => {
            const punto = e.target.getLatLng()

            fijar(punto.lat, punto.lng)
          })

        marcador.current.bindPopup(
          'Ubique el punto exacto de la entrega'
        )
      }

      mapa.current.setView(pos)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitud, longitud])

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
      clearTimeout(temporizador.current)

      peticion.current?.abort()

      if (mapa.current) {
        mapa.current.remove()
        mapa.current = null
      }
    },
    []
  )

  /* ---------------- buscador ---------------- */

  async function consultar(texto) {
    /* Respeta el intervalo mínimo entre peticiones. */
    const transcurrido = Date.now() - ultimaPeticion.current

    if (transcurrido < ESPERA_MINIMA_MS) {
      await new Promise((r) => {
        setTimeout(r, ESPERA_MINIMA_MS - transcurrido)
      })
    }

    ultimaPeticion.current = Date.now()

    peticion.current?.abort()

    const control = new AbortController()

    peticion.current = control

    setBuscando(true)

    try {
      const vista = [
        LIMITE.lonMin,
        LIMITE.latMax,
        LIMITE.lonMax,
        LIMITE.latMin,
      ].join(',')

      const url =
        `${NOMINATIM}&q=${encodeURIComponent(texto)}` +
        `&viewbox=${vista}&bounded=1`

      const respuesta = await fetch(url, {
        signal: control.signal,
      })

      if (!respuesta.ok) {
        throw new Error('el buscador no respondió')
      }

      const datos = await respuesta.json()

      setResultados(datos)
      setSugerencias(datos.length > 0)
      setIndiceActivo(-1)

      if (datos.length === 0) {
        setAviso(
          'Sin coincidencias en Lima. Pruebe con otra ' +
            'referencia o elija el punto en el mapa.'
        )
      } else {
        setAviso('')
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return
      }

      setAviso('No se pudo consultar el buscador: ' + err.message)
      setSugerencias(false)
    } finally {
      if (!control.signal.aborted) {
        setBuscando(false)
      }
    }
  }

  function alEscribir(event) {
    const texto = event.target.value

    setBusqueda(texto)
    setIndiceActivo(-1)

    clearTimeout(temporizador.current)

    if (texto.trim().length < MIN_CARACTERES) {
      setResultados([])
      setSugerencias(false)
      setBuscando(false)
      return
    }

    temporizador.current = setTimeout(() => {
      consultar(texto.trim())
    }, ESPERA_ESCRITURA_MS)
  }

  function elegir(lugar) {
    clearTimeout(temporizador.current)

    setSugerencias(false)
    setResultados([])
    setIndiceActivo(-1)
    setBusqueda('')
    setBuscando(false)

    fijar(Number(lugar.lat), Number(lugar.lon), lugar.display_name)
  }

  function alTeclear(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()

      setIndiceActivo((i) =>
        resultados.length === 0 ? -1 : Math.min(i + 1, resultados.length - 1)
      )

      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()

      setIndiceActivo((i) => Math.max(i - 1, -1))

      return
    }

    if (event.key === 'Enter') {
      if (sugerencias && resultados[indiceActivo]) {
        /* Evita que Enter envíe el formulario de la página. */
        event.preventDefault()

        elegir(resultados[indiceActivo])
      }

      return
    }

    if (event.key === 'Escape') {
      setSugerencias(false)
    }
  }

  function cerrarSugerencias() {
    /* Se espera un instante para que el clic en la sugerencia
       llegue antes de cerrar la lista. */
    setTimeout(() => {
      setSugerencias(false)
    }, 150)
  }

  const listaId = 'lista-ubicaciones'


  return (
    <div className="selector-ubicacion">

      <div className="buscador-ubicacion">
        <label>
          Buscar dirección o referencia

          <input
            type="text"
            role="combobox"
            aria-expanded={sugerencias}
            aria-controls={listaId}
            aria-autocomplete="list"
            autoComplete="off"
            value={busqueda}
            onChange={alEscribir}
            onKeyDown={alTeclear}
            onFocus={() => {
              if (resultados.length > 0) {
                setSugerencias(true)
              }
            }}
            onBlur={cerrarSugerencias}
            placeholder="Av. Próceres de la Independencia 1234"
          />
        </label>

        {buscando && (
          <span className="buscador-cargando">Buscando...</span>
        )}
      </div>

      {sugerencias && resultados.length > 0 && (
        <ul
          className="resultados-busqueda"
          id={listaId}
          role="listbox"
        >
          {resultados.map((lugar, indice) => (
            <li key={lugar.place_id} role="none">
              <button
                type="button"
                role="option"
                aria-selected={indice === indiceActivo}
                className={
                  indice === indiceActivo ? 'sugerencia activa' : 'sugerencia'
                }
                /* Evita que el input pierda el foco y se cierre
                   la lista antes del clic. */
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(lugar)}
              >
                <strong>{lugar.display_name}</strong>

                <span>
                  {Number(lugar.lat).toFixed(6)},{' '}
                  {Number(lugar.lon).toFixed(6)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {aviso && (
        <div className="mensaje error">{aviso}</div>
      )}

      <div
        ref={contenedor}
        className="mapa-ubicador"
        style={{ height: altura }}
        aria-label="Mapa para elegir la ubicación"
      />

      <p className="instruccion-mapa">
        Haga clic en el mapa o arrastre el marcador para
        ajustar el punto exacto.
      </p>

      <div className="coordenadas-elegidas">
        <span>
          <strong>Latitud:</strong>{' '}
          {hayCoordenada ? Number(latitud) : 'sin elegir'}
        </span>

        <span>
          <strong>Longitud:</strong>{' '}
          {hayCoordenada ? Number(longitud) : 'sin elegir'}
        </span>

        {hayCoordenada &&
          !dentroDeLima(Number(latitud), Number(longitud)) && (
            <span className="coordenada-fuera">
              fuera del área de Lima
            </span>
          )}
      </div>
    </div>
  )
}