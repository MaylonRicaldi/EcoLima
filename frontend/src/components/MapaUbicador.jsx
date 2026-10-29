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

/* Geocodificación inversa: convierte un punto en su dirección. Se usa
   cuando el usuario hace clic en el mapa o arrastra el marcador, para
   que el texto de la dirección se rellene solo. Sin esto, elegir un
   punto dejaba el formulario con coordenadas pero sin dirección. */
const NOMINATIM_INVERSO =
  'https://nominatim.openstreetmap.org/reverse' +
  '?format=jsonv2&zoom=18&addressdetails=1'


/* El icono por defecto de Leaflet es una imagen que se busca con
   rutas relativas al CSS. Con Vite eso a veces no resuelve y el
   marcador aparece como un cuadrado vacío o directamente no
   aparece. Un divIcon se dibuja con CSS, así que siempre se ve y
   además toma los colores del proyecto. */
const PIN_UBICACION = L.divIcon({
  className: 'pin-ubicacion',
  html: '<span class="pin-ubicacion-punta"></span>',
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -36],
})


/* Construye una dirección legible a partir de lo que devuelve
   Nominatim. Se descartan las partes que no sirven para ubicar a
   alguien: el código postal y el país.

   Se lee con `direccion.??` porque Nominatim no siempre devuelve
   todos los campos: una calle sin número o sin barrio es normal y
   no debe romper nada. */
function componerDireccion(datos) {
  const direccion = datos?.address || {}

  const partes = [
    direccion.road,
    direccion.house_number
      ? `N° ${direccion.house_number}`
      : '',
    direccion.suburb,
    direccion.neighbourhood,
    direccion.district || direccion.city_district,
    direccion.city || direccion.town || direccion.village,
  ]

  /* Set para quitar repeticiones: Nominatim repite el distrito en
     varios campos y una dirección con el mismo sitio tres veces se
     lee mal. */
  const unico = [...new Set(partes.filter(Boolean))]

  if (unico.length === 0) {
    return datos?.display_name || ''
  }

  return unico.join(', ')
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
  soloLectura = false,
}) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const marcador = useRef(null)

  const temporizador = useRef(null)
  const peticion = useRef(null)
  const ultimaPeticion = useRef(0)

  /* Número del último punto fijado. Sirve para descartar la dirección
     de un punto que ya se movió. */
  const puntoPedido = useRef(0)

  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [sugerencias, setSugerencias] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(-1)
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState('')

  /* Instancia viva del mapa. Se guarda además del ref para que los
     efectos que dependen del mapa se vuelvan a ejecutar cuando se
     (re)crea. */
  const [instanciaMapa, setInstanciaMapa] = useState(null)

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

    const m = L.map(contenedor.current, {
      center: hayCoordenada
        ? [Number(latitud), Number(longitud)]
        : CENTRO,
      zoom: 13,
    })

    /* Un clic fuera del mapa no debe fijar el punto: se escucha en
       el mapa, no en el contenedor, para que el scroll sobre los
       controles de la página no mueva la ubicación. */

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    ).addTo(m)

    m.on('click', (e) => {
      /* En modo sólo lectura el mapa muestra el punto pero no
         permite moverlo. Se usa cuando el punto no se elige aquí,
         por ejemplo la ubicación ya registrada de un cliente. */
      if (soloLectura) {
        return
      }

      fijarYDescribir(e.latlng.lat, e.latlng.lng)
    })

    mapa.current = m

    /* El mapa se avisa como estado, no solo como ref.

       El efecto del marcador necesita volver a correr cuando el mapa
       cambia. Antes solo dependía de las coordenadas, así que si el
       mapa se rehacía con las mismas coordenadas el efecto no
       volvía a dispararse y el marcador se quedaba en el mapa
       viejo, que ya no está en pantalla: el punto aparecía en el
       formulario pero el icono no se veía. */
    setInstanciaMapa(m)

    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------------- marcador ---------------- */

  useEffect(() => {
    if (!instanciaMapa || !hayCoordenada) {
      return
    }

    const pos = [Number(latitud), Number(longitud)]

    /* El marcador solo se reutiliza si de verdad pertenece al mapa
       que se está viendo. Si pertenece a otro, se suelta de ese y
       se crea uno nuevo aquí. */
    if (marcador.current && marcador.current._map !== instanciaMapa) {
      marcador.current._map?.removeLayer(marcador.current)
      marcador.current = null
    }

    if (!marcador.current) {
      marcador.current = L.marker(pos, {
        draggable: !soloLectura,
        icon: PIN_UBICACION,
      }).on('dragend', (e) => {
        const punto = e.target.getLatLng()

        fijarYDescribir(punto.lat, punto.lng)
      })

      marcador.current.bindPopup('Punto de entrega')
    }

    /* Sólo lectura y con marcador ya creado: se quita la capacidad
       de arrastre. Antes sólo se comprobaba al crearlo, así que un
       marcador nacido en modo edición seguía siendo arrastrable
       aunque después se bloqueara el mapa. */
    if (marcador.current.dragging) {
      if (soloLectura) {
        marcador.current.dragging.disable()
      } else {
        marcador.current.dragging.enable()
      }
    }

    marcador.current.setLatLng(pos).addTo(instanciaMapa)

    instanciaMapa.setView(pos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitud, longitud, instanciaMapa, soloLectura])

  useEffect(() => {
    if (!instanciaMapa) {
      return undefined
    }

    const alRedimensionar = () => instanciaMapa.invalidateSize()

    window.addEventListener('resize', alRedimensionar)

    return () => {
      window.removeEventListener('resize', alRedimensionar)
    }
  }, [instanciaMapa])

  useEffect(
    () => () => {
      clearTimeout(temporizador.current)

      peticion.current?.abort()

      if (marcador.current) {
        /* Se suelta antes de quitar el mapa: si no, el marcador se
           queda apuntando a un mapa destruido. */
        marcador.current.off()

        marcador.current._map?.removeLayer(marcador.current)

        marcador.current = null
      }

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

  /* ---------------- geocodificación inversa ---------------- */

  /* Pregunta a Nominatim qué dirección hay en ese punto. Se usa al
     hacer clic o al soltar el marcador, que son acciones
     deliberadas: una consulta por acción, no una por tecla.

     Si el servicio no responde, el punto ya está fijado igual: solo
     no se escribe la dirección. Perder la coordenada por no haber
     dirección sería peor que dejar el campo para escribirlo. */
  async function buscarDireccion(lat, lon, aplicar) {
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

    try {
      const url =
        `${NOMINATIM_INVERSO}&lat=${lat}&lon=${lon}` +
        `&countrycodes=pe`

      const respuesta = await fetch(url, { signal: control.signal })

      if (!respuesta.ok) {
        return
      }

      const datos = await respuesta.json()

      const texto = componerDireccion(datos)

      if (texto) {
        aplicar(texto)
      }
    } catch (err) {
      /* Si se cancela porque el usuario movió el punto otra vez, es
         normal y no se avisa. Cualquier otro fallo se registra: un
         error silencioso aquí hace imposible saber por qué la
         dirección no se rellena, que es justo lo que pasó con un
         `direcity` mal escrito. */
      if (err.name !== 'AbortError') {
        console.warn('[MapaUbicador] no se pudo obtener la dirección:', err)
      }
    }
  }


  /* Fija el punto por clic o arrastre y pide la dirección de ese
     punto.

     Cada clic genera un número. Cuando llega la respuesta se
     comprueba que siga siendo el último: si el usuario movió el
     punto otra vez mientras esperaba, la dirección que llegó sería
     de otro sitio y no se escribe. */
  function fijarYDescribir(lat, lon) {
    fijar(lat, lon)

    const marca = ++puntoPedido.current

    buscarDireccion(lat, lon, (texto) => {
      if (marca !== puntoPedido.current) {
        return
      }

      onCambio({
        latitud: Number(Number(lat).toFixed(7)),
        longitud: Number(Number(lon).toFixed(7)),
        etiqueta: texto,
      })
    })
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
        {soloLectura ? (
          <p className="instruccion-mapa">
            Este punto no se modifica aquí: viene del registro del
            cliente. Para entregar en otro sitio, elija la opción
            de otro punto.
          </p>
        ) : (
          <>
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
              <span className="buscador-cargando">
                Buscando...
              </span>
            )}
          </>
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
        {soloLectura
          ? 'El punto está fijo: muestra dónde queda el registro del cliente.'
          : 'Haga clic en el mapa o arrastre el marcador para ajustar ' +
            'el punto exacto. La dirección se escribe sola con el ' +
            'punto; si no aparece, puede escribirla a mano.'}
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