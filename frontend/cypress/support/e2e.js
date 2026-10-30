Cypress.Commands.add('login', () => {
  return cy.env(['e2eEmail', 'e2ePassword']).then(({ e2eEmail, e2ePassword }) => {
    if (!e2eEmail || !e2ePassword) {
      throw new Error(
        'Faltan las credenciales temporales de E2E. Ejecuta tests/run-e2e.ps1.'
      )
    }

    cy.visit('/')
    cy.get('#email').type(e2eEmail)
    cy.get('#password').type(e2ePassword, { log: false })
    cy.contains('button', 'Iniciar sesión').click()
    cy.location('pathname').should('eq', '/dashboard')
    cy.get('main h1').should('contain.text', 'Dashboard')
  })
})
