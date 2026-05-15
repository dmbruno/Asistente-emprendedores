// Supervisor del servicio Baileys.
// Levanta un servidor HTTP interno que el Flask consume para:
//  - pedir el QR de un cliente
//  - consultar estado de su sesión
//  - enviar mensajes outbound
// Y mantiene N instancias de Baileys, una por cliente activo.

import 'dotenv/config'
import express from 'express'
import pino from 'pino'

import { InstanceManager } from './instance.js'

const log = pino({ level: process.env.LOG_LEVEL || 'info' })
const PORT = Number(process.env.BAILEYS_PORT || 3001)
const SHARED_SECRET = process.env.BAILEYS_SHARED_SECRET || ''

if (!SHARED_SECRET) {
  log.warn('BAILEYS_SHARED_SECRET vacío: el servicio rechazará todas las requests autenticadas')
}

const manager = new InstanceManager({ logger: log })
const app = express()
app.use(express.json({ limit: '20mb' }))

// Auth middleware: header X-Baileys-Token debe coincidir con el shared secret.
app.use((req, res, next) => {
  if (req.path === '/health') return next()
  const token = req.header('X-Baileys-Token')
  if (!SHARED_SECRET || token !== SHARED_SECRET) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  next()
})

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Inicia (o devuelve) una instancia y devuelve el QR si todavía no está conectada.
app.post('/instances/:clienteId/qr', async (req, res) => {
  try {
    const { clienteId } = req.params
    const result = await manager.ensureInstance(clienteId)
    res.json(result)
  } catch (err) {
    log.error({ err }, 'error iniciando instancia')
    res.status(500).json({ error: 'internal_error' })
  }
})

app.get('/instances/:clienteId/status', async (req, res) => {
  const { clienteId } = req.params
  res.json(manager.statusOf(clienteId))
})

app.post('/instances/:clienteId/send', async (req, res) => {
  try {
    const { clienteId } = req.params
    const { to, text } = req.body
    await manager.sendText(clienteId, to, text)
    res.json({ sent: true })
  } catch (err) {
    log.error({ err }, 'error enviando mensaje')
    res.status(500).json({ error: 'internal_error' })
  }
})

app.post('/instances/:clienteId/send-document', async (req, res) => {
  try {
    const { clienteId } = req.params
    const { to, pdf_base64, filename, caption } = req.body
    await manager.sendDocument(clienteId, to, pdf_base64, filename, caption)
    res.json({ sent: true })
  } catch (err) {
    log.error({ err }, 'error enviando documento')
    res.status(500).json({ error: 'internal_error' })
  }
})

app.delete('/instances/:clienteId', async (req, res) => {
  const { clienteId } = req.params
  await manager.disconnect(clienteId)
  res.json({ disconnected: true })
})

app.listen(PORT, () => {
  log.info({ port: PORT }, 'Baileys supervisor escuchando')
})

// TODO: al arrancar, leer de Supabase los clientes con sesiones existentes y
// rehidratarlas en background para no perder pareo tras reinicio.
