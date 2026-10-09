/**
 * Placeholder de carga.
 *
 * Sustituye al texto "Cargando..." por filas con un destello que se
 * desplaza, para que se note que la pantalla está viva mientras
 * llega la respuesta del backend.
 *
 * No inventa datos: sólo muestra la forma aproximada de lo que
 * habrá debajo (filas de tabla o tarjetas).
 */
export default function Esqueleto({
  texto = 'Cargando',
  filas = 4,
  tipo = 'filas',
}) {
  return (
    <div
      className={`esqueleto esqueleto-${tipo}`}
      role="status"
      aria-live="polite"
    >
      <span className="esqueleto-texto">
        <span className="esqueleto-punto" />

        {texto}
      </span>

      <div className="esqueleto-filas" aria-hidden="true">
        {Array.from({ length: filas }, (_, indice) => (
          <span
            key={indice}
            className="esqueleto-fila"
            style={{ '--indice': indice }}
          />
        ))}
      </div>
    </div>
  )
}