import { readFile, writeFile } from 'node:fs/promises'

const reportUrl = new URL('../coverage/lcov.info', import.meta.url)
const report = await readFile(reportUrl, 'utf8')
const normalizedReport = report.replace(/^SF:src[\\/](.+)$/gm, (_line, file) => (
  `SF:backend/src/${file.replace(/\\/g, '/')}`
))

await writeFile(reportUrl, normalizedReport)
