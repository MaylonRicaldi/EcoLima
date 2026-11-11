import {
  bestCategory, bestCategoryFor, blockingReason, enablesAny, enablesCategory,
} from '../src/core/licenses.js'
import { Resultado } from './shared.js'

const result = new Resultado('Habilitación de conductores por licencia')
for (const category of ['A-I', 'A-IIA', 'A-IIB', 'A-IIIA', 'A-IIIB', 'A-IIIC']) {
  result.check(`${category} habilita camioneta`, enablesCategory('CAMIONETA', category))
  result.check(`${category} no habilita moto`, !enablesCategory('MOTO', category))
}
result.check('B-IIB habilita moto', enablesCategory('MOTO', 'B-IIB'))
result.check('B-IIC habilita moto', enablesCategory('MOTO', 'B-IIC'))
result.check('B-I no habilita moto', !enablesCategory('MOTO', 'B-I'))
result.check('B-IIA no habilita moto', !enablesCategory('MOTO', 'B-IIA'))
for (const category of ['B-I', 'B-IIA', 'B-IIB', 'B-IIC']) {
  result.check(`${category} no habilita camioneta`, !enablesCategory('CAMIONETA', category))
}
result.check('clases A/B no se mezclan', !enablesAny(['A-IIIC'], 'MOTO'))
result.check('mejor categoría A', bestCategory(['A-I', 'A-IIB', 'A-IIA']) === 'A-IIB')
result.check('mejor categoría moto', bestCategoryFor(['A-IIIC', 'B-IIA'], 'MOTO') === 'B-IIA')
result.check('categoría ausente devuelve null', bestCategory([]) == null)
result.check('categoría bloqueada genera motivo', Boolean(blockingReason('A-I', 'MOTO')))
process.exitCode = result.resumen() ? 0 : 1
