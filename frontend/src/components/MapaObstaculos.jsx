import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/* Centro de San Juan de Lurigancho */
const CENTRO = [-12.015, -77.005]

/* Límite del área de Lima (RN-011) */
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

/* El cono se dibuja con CSS, como el pin de la entrega.
   Naranja y con franjas, que es como se pinta de verdad un cono de
   obra, y para que se distinga de un vistazo del punto de entrega. */
const CONO = L.divIcon({
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

const TIPOS = [
  { valor: 'CONO', texto: 'Cono de obra' },
  { valor: 'OBRA', texto: 'Obra en la vía' },
  { valor: 'BACHE', texto: 'Bache' },
  { valor: 'ARBOL', texto: 'Árbol caído' },
  { valor: 'BLOQUEO_CALLE', texto: 'Calle bloqueada' },
  { valor: 'OTRO', texto: 'Otro' },
]


/**
 * Mapa de obstáculos de la calzada (Sprint 03).
 *
 * Muestra los conos que han puesto los conductores y permite poner
 * uno nuevo. El cono se queda en el mapa: no desaparece al terminar
 * la ruta, porque la obstrucción sigue ahí y las rutas siguientes
 * tienen que esquivarla. Se quita con el botón de cada uno.
 *
 * Los obstáculos son datos del servidor, no de esta vista: esta
 * lista puede ser la de todos o la de la ruta que se está viendo.
 */
export default function MapaObstaculos({
  obstaculos = [],
  onColocar,
  onQuitar,
  alto = '20rem',
  latitud,
  longitud,
}) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const capa = useRef(null)
  const capaCono = useRef(null)

  /* El cono que se está colocando va en su propia capa para poder
     distinguirlos de los ya registrados. */
  const placing = useRef(null)

  const [tipoCono, setTipoCono] = useState('CONO')
  const [descripcionCono, setDescripcionCono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorCono, setErrorCono] = useState('')

  /* Si hay un cono a medio colocar. Va en estado y no sólo en el
     ref porque el ref no vuelve a pintar la pantalla: el formulario
     de confirmación aparecería un clic tarde, o no aparecería. */
  const [hayCono, setHayCono] = useState(false)

  /* Registra el cono colocado. Avisa al padre sólo cuando el
     backend confirma: si el registro falla, el cono de la pantalla
     no debe quedar como si estuviera ya guardado. */
  async function confirmarCono() {
    if (!placing.current || !onColocar) {
      return
    }

    const punto = placing.current.getLatLng()

    if (!descripcionCono.trim()) {
      setErrorCono(
        'Escriba qué pasa en ese punto para que el conductor lo ' +
          'reconozca.'
      )
      return
    }

    try {
      setEnviando(true)
      setErrorCono('')

      await onColocar({
        tipo: tipoCono,
        descripcion: descripcionCono.trim(),
        latitud: punto.lat,
        longitud: punto.lng,
        nivel: 'ALTO',
      })

      descartarCono()
    } catch (err) {
      setErrorCono(err.message)
    } finally {
      setEnviando(false)
    }
  }

  function descartarCono() {
    capaCono.current?.clearLayers()
    placing.current = null

    setHayCono(false)
    setTipoCono('CONO')
    setDescripcionCono('')
    setErrorCono('')
  }

  useEffect(() => {
    if (!contenedor.current || mapa.current) {
      return undefined
    }

    const hayPunto =
      latitud !== '' &&
      longitud !== '' &&
      !Number.isNaN(Number(latitud)) &&
      !Number.isNaN(Number(longitud))

    const m = L.map(contenedor.current, {
      center: hayPunto
        ? [Number(latitud), Number(longitud)]
        : CENTRO,
      zoom: hayPunto ? 15 : 12,
      scrollWheelZoom: false,
    })

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    ).addTo(m)

    capa.current = L.layerGroup().addTo(m)
    capaCono.current = L.layerGroup().addTo(m)

    mapa.current = m

    return () => {
      capaCono.current?.clearLayers()
      capa.current?.clearLayers()

      m.remove()
      mapa.current = null
      capa.current = null
      capaCono.current = null
    }
  }, [])

  /* Redibuja los conos cada vez que llega la lista.
     Se eliminan los anteriores porque si no se quedan accumulate
     Marker sobre Marker al actualizar. */
  useEffect(() => {
    if (!capa.current) {
      return
    }

    capa.current.clearLayers()

    for (const o of obstaculos) {
      const lat = Number(o.latitud)
      const lon = Number(o.longitud)

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        continue
      }

      const marca = L.marker([lat, lon], { icon: CONO })

      const texto =
        `<strong>${o.tipo === 'CONO' ? 'Cono' : o.tipo}</strong><br/>` +
        o.descripcion +
        '<br/><small>' +
        (o.fecha_registro
          ? String(o.fecha_registro).slice(0, 16).replace('T', ' ')
          : '') +
        '</small>'

      marca.bindPopup(texto)

      if (onQuitar) {
        marca.bindPopup(texto + '<br/><br/>')

        marca.on('popupopen', (e) => {
          const boton = document.createElement('button')

          boton.textContent = 'Quitar el cono'
          boton.className = 'boton-secundario boton-popup'
          boton.onclick = () => {
            e.popup.close()
            onQuitar(o)
          }

          e.popup.getElement()?.appendChild(boton)
        })
      }

      marca.addTo(capa.current)
    }
  }, [obstaculos, onQuitar])

  /* Sitúa la cámara en el punto donde se coloca el cono. */
  useEffect(() => {
    if (!mapa.current) {
      return
    }

    if (
      latitud === '' ||
      longitud === '' ||
      Number.isNaN(Number(latitud))
    ) {
      return
    }

    mapa.current.setView([Number(latitud), Number(longitud)])
  }, [latitud, longitud])

  function manejarClick(event) {
    const m = mapa.current

    if (!m || !onColocar) {
      return
    }

    const lat = event.latlng.lat
    const lon = event.latlng.lng

    if (!dentroDeLima(lat, lon)) {
      return
    }

    capaCono.current?.clearLayers()

    placing.current = L.marker([lat, lon], {
      icon: CONO,
      draggable: true,
      zIndexOffset: 1000,
    }).addTo(capaCono.current)

    placing.current.bindPopup(
      'Cono por colocar. Elija el tipo y confirme.',
      { closeButton: true }
    )

    placing.current.openPopup()

    setHayCono(true)
  }

  /* Al montar, el mapa ya está en marcha: por eso se registra
     el clic en un efecto aparte en vez de dentro del efecto que
     crea el mapa. Si el mapa se recreara, el clic quedaría sin
     registrar. */
  useEffect(() => {
    const m = mapa.current

    if (!m) {
      return undefined
    }

    m.on('click', manejarClick)

    return () => {
      m.off('click', manejarClick)
    }
  }, [onColocar])

  /* Si ya hay un cono colocado, el siguiente clic lo mueve en
     lugar de colocar otro. Así se corrige la posición sin volver
     a empezar. */
  useEffect(() => {
    const cono = placing.current

    if (!cono) {
      return undefined
    }

    const alArrastrar = (event) => {
      const punto = event.target.getLatLng()

      if (!dentroDeLima(punto.lat, punto.lng)) {
        event.target.setLatLng(cono.getLatLng())
      }
    }

    cono.on('dragend', alArrastrar)

    return () => {
      cono.off('dragend', alArrastrar)
    }
  }, [obstaculos])

  return (
    <div className="mapa-obstaculos">
      <div
        ref={contenedor}
        className="mapa-ubicador"
        style={{ height: alto }}
        aria-label="Mapa de obstáculos de la calzada"
      />

      <p className="instruccion-mapa">
        {hayCono
          ? 'Arrastre el cono para ajustar el punto exacto.'
          : onColocar
            ? 'Haga clic en el mapa para colocar el cono donde está ' +
              'el malestar.'
            : 'Conos registrados en la calzada.'}
      </p>

      {hayCono && onColocar && (
        <div className="form-cono">
          <div className="form-grid">
            <label>
              Tipo
              <select
                value={tipoCono}
                onChange={(e) => setTipoCono(e.target.value)}
              >
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.texto}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Qué pasa ahí
              <input
                type="text"
                value={descripcionCono}
                onChange={(e) => setDescripcionCono(e.target.value)}
                placeholder="Bache profundo en el carril derecho"
                maxLength="200"
              />
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="boton-principal"
              onClick={confirmarCono}
              disabled={enviando}
            >
              {enviando
                ? 'Registrando...'
                : 'Registrar el cono'}
            </button>

            <button
              type="button"
              className="boton-secundario"
              onClick={descartarCono}
            >
              Descartar
            </button>
          </div>

          <p className="ayuda-campo">
            El cono se queda en el mapa y se tendrá en cuenta al
            planificar. Se quita con su botón cuando ya no moleste.
          </p>
        </div>
      )}
    </div>
  )
}