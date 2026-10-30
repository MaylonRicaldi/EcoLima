const API_URL = 'http://localhost:8000'

describe('EcoLima end-to-end', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.intercept('https://*.tile.openstreetmap.org/**', {
      statusCode: 200,
      body: '',
    })
    cy.intercept('GET', 'https://nominatim.openstreetmap.org/reverse*', {
      statusCode: 200,
      body: {
        display_name: 'Av. Prueba E2E, Lima',
        address: {
          road: 'Av. Prueba E2E',
          district: 'San Juan de Lurigancho',
        },
      },
    })
  })

  it('rechaza credenciales inválidas y protege las rutas privadas', () => {
    cy.visit('/clientes')
    cy.location('pathname').should('eq', '/')

    cy.env(['e2eEmail']).then(({ e2eEmail }) => {
      cy.get('#email').type(e2eEmail)
      cy.get('#password').type('clave-incorrecta', {
        log: false,
      })
      cy.contains('button', 'Iniciar sesión').click()
      cy.contains('Credenciales incorrectas').should('be.visible')
    })

    cy.request({
      url: `${API_URL}/clientes`,
      failOnStatusCode: false,
    }).its('status').should('eq', 401)
  })

  it('inicia sesión, carga el dashboard y mantiene la navegación por módulos', () => {
    cy.login()

    cy.contains('h2', 'Operación logística').should('be.visible')
    cy.get('a[aria-label="Clientes"]').click()
    cy.get('h1').should('contain.text', 'Gestión de clientes')
    cy.get('a[aria-label="Vehículos"]').click()
    cy.get('h1').should('contain.text', 'Gestión de vehículos')
    cy.get('a[aria-label="Pedidos"]').click()
    cy.get('h1').should('contain.text', 'Gestión de pedidos')

    cy.contains('button', 'Cerrar sesión').click()
    cy.location('pathname').should('eq', '/')
    cy.get('#email').should('be.visible')
  })

  it('crea y actualiza clientes y vehículos desde la interfaz', () => {
    cy.login()

    const nombreCliente = 'Cliente Cypress E2E'
    const correoCliente = 'cliente.cypress@ecolima.com'

    cy.get('a[aria-label="Clientes"]').click()
    cy.contains('button', 'Registrar cliente').click()
    cy.get('[role="dialog"][aria-label="Registrar cliente"]').within(() => {
      cy.get('input[name="nombre"]').type(nombreCliente)
      cy.get('input[name="email"]').type(correoCliente)
      cy.get('input[name="direccion"]').type('Av. Cypress 123, Lima')
      cy.get('.leaflet-container').should('be.visible').click('center', {
        force: true,
      })
      cy.get('input[name="latitud"]').should('not.have.value', '')
      cy.contains('button', 'Registrar cliente').click()
    })

    cy.contains('Cliente registrado correctamente.').should('be.visible')
    cy.get('[role="dialog"] button[aria-label="Cerrar"]').click()
    cy.get('.tabla-container').scrollTo('right')
    cy.contains('tr', nombreCliente).within(() => {
      cy.contains('button', 'Editar').click()
    })
    cy.get('[role="dialog"][aria-label="Editar cliente"]').within(() => {
      cy.get('input[name="nombre"]')
        .clear()
        .type('Cliente Cypress actualizado')
      cy.contains('button', 'Actualizar cliente').click()
    })
    cy.contains('Cliente actualizado correctamente.').should('be.visible')
    cy.contains('tr', 'Cliente Cypress actualizado').should('be.visible')
    cy.get('[role="dialog"] button[aria-label="Cerrar"]').click()

    cy.get('a[aria-label="Vehículos"]').click()
    cy.contains('button', 'Registrar vehículo').click()
    cy.get('[role="dialog"][aria-label="Registrar vehículo"]').within(() => {
      cy.get('input[name="placa"]').type('E2E-321')
      cy.get('input[name="marca"]').type('Cypress')
      cy.get('input[name="modelo"]').type('Prueba')
      cy.get('input[name="capacidad_kg"]').type('800')
      cy.get('input[name="capacidad_m3"]').type('5')
      cy.get('input[name="consumo_km_l"]').type('10')
      cy.get('input[name="factor_co2_kg_km"]').type('0.9')
      cy.contains('button', 'Registrar vehículo').click()
    })

    cy.contains('Vehículo registrado correctamente.').should('be.visible')
    cy.contains('tr', 'E2E-321').should('be.visible')
    cy.get('.tabla-container').scrollTo('right')
    cy.contains('tr', 'E2E-321').within(() => {
      cy.contains('button', 'Editar').click()
    })
    cy.get('[role="dialog"][aria-label="Editar vehículo"]').within(() => {
      cy.get('input[name="modelo"]').clear().type('Actualizado')
      cy.contains('button', 'Actualizar vehículo').click()
    })
    cy.contains('Vehículo actualizado correctamente.').should('be.visible')
    cy.contains('tr', 'E2E-321').should('contain.text', 'Actualizado')
  })

  it('crea un pedido y genera una ruta con recursos de prueba', () => {
    cy.login()

    cy.env(['e2eEmail', 'e2ePassword']).then(({ e2eEmail, e2ePassword }) => {
      cy.request('POST', `${API_URL}/auth/login`, {
        email: e2eEmail,
        password: e2ePassword,
      }).then(({ body }) => {
        cy.request({
          method: 'POST',
          url: `${API_URL}/pedidos`,
          headers: {
            Authorization: `Bearer ${body.access_token}`,
          },
          body: {
            id_cliente: 1,
            id_ventana_tiempo: 1,
            direccion_entrega: 'Av. Entrega Cypress 456',
            latitud: -12.015,
            longitud: -77.005,
            peso_kg: 25,
            volumen_m3: 0.5,
            prioridad: 'ESTANDAR',
            tipo_producto: 'NO_PERECEDERO',
          },
        }).its('status').should('eq', 201)

        cy.intercept('GET', '**/pedidos').as('cargarPedidos')
        cy.get('a[aria-label="Pedidos"]').click()
        cy.wait('@cargarPedidos')
        cy.contains('Av. Entrega Cypress 456').should('be.visible')

      cy.request({
        method: 'POST',
        url: `${API_URL}/rutas/optimizar`,
        headers: {
          Authorization: `Bearer ${body.access_token}`,
        },
        body: {
          algoritmo: 'SA',
          iteraciones: 50,
          semilla: 17,
          fecha: new Date().toISOString().slice(0, 10),
        },
        timeout: 90000,
      }).then(({ body: resultado }) => {
        expect(resultado.rutas_creadas).to.have.length.greaterThan(0)
        expect(resultado.pedidos_planificados).to.be.greaterThan(0)

        const idRuta = resultado.rutas_creadas[0].id_ruta
        cy.request({
          url: `${API_URL}/rutas/${idRuta}`,
          headers: {
            Authorization: `Bearer ${body.access_token}`,
          },
        }).then(({ body: ruta }) => {
          expect(ruta.id_ruta).to.eq(idRuta)
          expect(ruta.paradas).to.have.length.greaterThan(0)
          expect(ruta.asignacion).to.exist
          expect(ruta.asignacion.id_vehiculo).to.be.greaterThan(0)
          expect(ruta.asignacion.id_conductor).to.be.greaterThan(0)
          })
        })
      })
    })
  })

  it('aplica permisos del backend según el rol autenticado', () => {
    cy.env(['e2ePassword']).then(({ e2ePassword }) => {
      cy.request('POST', `${API_URL}/auth/login`, {
        email: 'conductor@ecolima.com',
        password: e2ePassword,
      }).then(({ body }) => {
      cy.request({
        url: `${API_URL}/usuarios`,
        headers: {
          Authorization: `Bearer ${body.access_token}`,
        },
        failOnStatusCode: false,
      }).its('status').should('eq', 403)

      cy.request({
        url: `${API_URL}/vehiculos`,
        headers: {
          Authorization: `Bearer ${body.access_token}`,
        },
      }).its('status').should('eq', 200)
      })
    })
  })
})
