import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import './Modal.css'


/**
 * Cuadro de diálogo para los formularios de registro.
 *
 * Antes los formularios se incrustaban debajo del contenido de cada
 * módulo, lo que obligaba a hacer scroll para encontrarlos y
 * mezclaba el alta con la lista. Con este componente el registro
 * aparece en una ventana propia y el listado queda intacto detrás.
 *
 * Se cierra con el botón, con Escape o con el fondo oscurecido.
 */
export default function Modal({
  titulo,
  descripcion,
  abierto,
  onCerrar,
  ancho = 'mediano',
  children,
  pie,
}) {
  const caja = useRef(null)

  /* La función de cierre se guarda en un ref para poder llamarla
     desde el listener sin volver a suscribirlo en cada render.
     Si el efecto la tomara como dependencia, escribir una letra
     re-renderizaría el componente, el efecto se repetiría y le
     quitaría el foco al usuario a medio teclear. */
  const refCerrar = useRef(onCerrar)

  useEffect(() => {
    refCerrar.current = onCerrar
  })

  /* Al abrir: el foco entra al primer campo del formulario, nunca
     al botón de cerrar, y Escape cierra.
     Sólo depende de `abierto`: no debe volver a ejecutarse mientras
     el usuario escribe. */
  useEffect(() => {
    if (!abierto) {
      return undefined
    }

    const primerCampo = caja.current?.querySelector(
      'input:not([type="hidden"]):not([type="submit"]), select, textarea'
    )

    primerCampo?.focus()

    function conEscape(event) {
      if (event.key === 'Escape') {
        refCerrar.current()
      }
    }

    document.addEventListener('keydown', conEscape)

    /* El fondo no debe desplazarse mientras el modal está abierto. */
    const anterior = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', conEscape)
      document.body.style.overflow = anterior
    }
  }, [abierto])

  if (!abierto) {
    return null
  }

  /* El modal se monta directamente en <body>, no donde está escrito
     en el JSX.

     Las tarjetas de la aplicación entran con una animación de
     translateY, y un transform convierte a la tarjeta en el punto de
     referencia de sus hijos position:fixed. Eso hacía que el modal
     de licencias se midiera contra su <section> en vez de contra la
     ventana, y quedara medio fuera de la pantalla: los campos de
     arriba no se veían.

     Con el portal, el modal cuelga de <body>, que no tiene
     transform, así que position:fixed se resuelve contra la ventana
     como corresponde. */
  return createPortal(
    <div
      className="modal-fondo"
      onMouseDown={(event) => {
        /* Sólo cierra si el gesto empezó en el fondo, no dentro. */
        if (event.target === event.currentTarget) {
          onCerrar()
        }
      }}
    >
      <div
        className={`modal modal-${ancho}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        ref={caja}
      >
        <header className="modal-cabecera">
          <div>
            <h2>{titulo}</h2>

            {descripcion && <p>{descripcion}</p>}
          </div>

          <button
            type="button"
            className="modal-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="modal-cuerpo">{children}</div>

        {pie && <footer className="modal-pie">{pie}</footer>}
      </div>
    </div>,
    document.body,
  )
}