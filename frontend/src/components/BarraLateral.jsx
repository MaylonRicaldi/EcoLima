import { NavLink } from 'react-router-dom'


/**
 * Barra lateral con los módulos del sistema.
 *
 * Se pliega a una franja de iconos para dejarle espacio a las
 * tablas, y en pantallas chicas se convierte en un cajón que se
 * abre y se cierra sobre el contenido.
 */
export default function BarraLateral({
  usuario,
  modulos,
  rutaActiva,
  plegada,
  onPlegar,
  onCerrarSesion,
  onNavegar,
}) {
  /* Iniciales para el avatar,，最多 dos letras */
  const iniciales = (usuario?.nombre || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0])
    .join('')

  const descripcion = plegada
    ? 'Expandir módulos'
    : 'Contraer módulos'


  return (
    <aside
      className={`barra-lateral${plegada ? ' plegada' : ''}`}
    >

      <div className="barra-lateral-contenido">

        <div className="barra-marca">
          <span
            className="barra-marca-logo"
            aria-hidden="true"
          >
            🌿
          </span>

          <span className="barra-marca-texto">
            <span className="barra-marca-nombre">
              EcoLogística Lima
            </span>

            <span className="barra-marca-rol">
              {usuario?.rol}
            </span>
          </span>
        </div>


        <button
          type="button"
          className="barra-plegar"
          onClick={onPlegar}
          aria-expanded={!plegada}
          title={descripcion}
        >
          <span
            className="barra-plegar-flecha"
            aria-hidden="true"
          >
            ☰
          </span>

          <span className="barra-plegar-texto">
            {descripcion}
          </span>
        </button>


        <ul className="barra-modulos">
          {modulos.map(([ruta, texto, icono]) => (
            <li key={ruta} className="barra-modulo">
              <NavLink
                to={ruta}
                className={({ isActive }) =>
                  isActive || ruta === rutaActiva
                    ? 'activo'
                    : ''
                }
                onClick={onNavegar}
                title={plegada ? texto : undefined}
                /* Plegada sólo se ve el icono, así que el nombre
                   tiene que estar disponible para lector de pantalla */
                aria-label={texto}
              >
                <span
                  className="barra-modulo-icono"
                  aria-hidden="true"
                >
                  {icono}
                </span>

                <span className="barra-modulo-texto">
                  {texto}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>


        <div className="barra-pie">
          <div className="barra-usuario">
            <span
              className="barra-avatar"
              aria-hidden="true"
            >
              {iniciales}
            </span>

            <span className="barra-usuario-datos">
              <span className="barra-usuario-nombre">
                {usuario?.nombre}
              </span>

              <span className="barra-usuario-correo">
                {usuario?.email}
              </span>
            </span>
          </div>

          <button
            type="button"
            className="barra-salir"
            onClick={onCerrarSesion}
            title="Cerrar sesión"
          >
            <span aria-hidden="true">⏻</span>

            <span className="barra-salir-texto">
              Cerrar sesión
            </span>
          </button>
        </div>

      </div>
    </aside>
  )
}