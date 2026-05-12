// Manejo de una instancia Baileys por cliente.

import { Boom } from '@hapi/boom'
import {
  default as makeWASocket,
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys'
import qrcode from 'qrcode'
import pino from 'pino'

import { handleIncomingMessage } from './handlers/incoming.js'

// Logger silencioso para Baileys (evita spam de bajo nivel)
const baileysLogger = pino({ level: 'silent' })

export class InstanceManager {
  constructor({ logger }) {
    this.log = logger
    this.instances = new Map() // clienteId -> { sock, status, qr, lastQrAt, retries }
  }

  statusOf(clienteId) {
    const inst = this.instances.get(clienteId)
    if (!inst) return { status: 'desconectado', qr: null }
    return { status: inst.status, qr: inst.qr }
  }

  async ensureInstance(clienteId) {
    const existing = this.instances.get(clienteId)
    if (existing && existing.status === 'conectado') {
      return { status: 'conectado', qr: null }
    }
    if (existing && existing.qr) {
      return { status: existing.status, qr: existing.qr }
    }
    if (existing && existing.status === 'esperando_qr') {
      // Ya está iniciando, esperar el QR
      return { status: 'esperando_qr', qr: null }
    }
    return this._start(clienteId)
  }

  async _start(clienteId) {
    this.log.info({ clienteId }, 'Iniciando instancia Baileys')

    const authDir = `./sessions/${clienteId}`
    const { state, saveCreds } = await useMultiFileAuthState(authDir)

    // Obtener la versión más reciente del protocolo de WhatsApp
    const { version, isLatest } = await fetchLatestBaileysVersion()
    this.log.info({ version, isLatest }, 'Versión de WhatsApp Web')

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: baileysLogger,
      // Browser identification: necesario para que WhatsApp acepte la conexión
      browser: Browsers.macOS('Safari'),
      // Configuración de conexión
      connectTimeoutMs: 30_000,
      defaultQueryTimeoutMs: 30_000,
      keepAliveIntervalMs: 15_000,
      markOnlineOnConnect: false,
    })

    const existing = this.instances.get(clienteId)
    const retries = existing?.retries ?? 0

    const inst = {
      sock,
      status: 'esperando_qr',
      qr: null,
      lastQrAt: null,
      retries,
    }
    this.instances.set(clienteId, inst)

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      this.log.info({ clienteId, connection: connection ?? '—', hasQR: !!qr }, 'connection.update')

      if (qr) {
        inst.qr = await qrcode.toDataURL(qr)
        inst.lastQrAt = Date.now()
        inst.status = 'esperando_qr'
        inst.retries = 0
        this.log.info({ clienteId }, 'QR generado — listo para escanear')
      }

      if (connection === 'open') {
        inst.status = 'conectado'
        inst.qr = null
        inst.retries = 0
        this.log.info({ clienteId }, 'WhatsApp conectado exitosamente')
      }

      if (connection === 'close') {
        const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
        const reason = Object.entries(DisconnectReason).find(([, v]) => v === statusCode)?.[0] ?? statusCode
        const isLoggedOut = statusCode === DisconnectReason.loggedOut

        inst.status = 'desconectado'
        this.log.warn({ clienteId, reason, statusCode, retries: inst.retries }, 'Conexión cerrada')

        if (!isLoggedOut) {
          const delay = Math.min(3000 * (inst.retries + 1), 15_000) // backoff: 3s, 6s, 9s... max 15s
          inst.retries += 1
          this.log.info({ clienteId, delay, retries: inst.retries }, `Reconectando en ${delay}ms`)
          setTimeout(() => this._start(clienteId).catch((e) => {
            this.log.error({ clienteId, err: e.message }, 'Error al reconectar')
          }), delay)
        } else {
          this.log.warn({ clienteId }, 'Sesión cerrada por WhatsApp (loggedOut). Borrar sesión para reconectar.')
          // Borrar sesión del filesystem para forzar QR nuevo la próxima vez
          try {
            const { rm } = await import('fs/promises')
            await rm(authDir, { recursive: true, force: true })
            this.log.info({ clienteId }, 'Sesión borrada del disco')
          } catch { /* ignore */ }
          this.instances.delete(clienteId)
        }
      }
    })

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return
      for (const msg of messages) {
        try {
          await handleIncomingMessage({ clienteId, msg, sock, logger: this.log })
        } catch (err) {
          this.log.error({ err, clienteId }, 'error procesando mensaje entrante')
        }
      }
    })

    return { status: inst.status, qr: inst.qr }
  }

  async sendText(clienteId, to, text) {
    const inst = this.instances.get(clienteId)
    if (!inst || inst.status !== 'conectado') {
      throw new Error(`instancia ${clienteId} no conectada`)
    }
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
    await inst.sock.sendMessage(jid, { text })
  }

  async sendDocument(clienteId, to, pdfBase64, filename, caption) {
    const inst = this.instances.get(clienteId)
    if (!inst || inst.status !== 'conectado') {
      throw new Error(`instancia ${clienteId} no conectada`)
    }
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
    const buffer = Buffer.from(pdfBase64, 'base64')
    await inst.sock.sendMessage(jid, {
      document: buffer,
      mimetype: 'application/pdf',
      fileName: filename,
      caption: caption || '',
    })
  }

  async disconnect(clienteId) {
    const inst = this.instances.get(clienteId)
    if (!inst) return
    try {
      await inst.sock.logout()
    } catch { /* ignore */ }
    this.instances.delete(clienteId)
  }
}
