// Handler de mensajes entrantes de WhatsApp.

import { downloadMediaMessage } from '@whiskeysockets/baileys'

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5001'
const SHARED_SECRET = process.env.BAILEYS_SHARED_SECRET || ''

const TIPO_KEYWORDS = {
  compra: 'compra',
  compras: 'compra',
  gasto: 'compra',
  venta: 'venta',
  ventas: 'venta',
  factura: 'compra', // default si no aclara
}

function detectarTipo(text = '') {
  const t = text.toLowerCase().trim()
  for (const [kw, tipo] of Object.entries(TIPO_KEYWORDS)) {
    if (t.includes(kw)) return tipo
  }
  return null
}

async function postWebhook(path, body) {
  const url = `${FLASK_API_URL}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Baileys-Token': SHARED_SECRET,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`webhook ${path} respondió ${res.status}`)
  }
  return res.json()
}

export async function handleIncomingMessage({ clienteId, msg, sock, logger }) {
  if (msg.key.fromMe) return
  const remoteJid = msg.key.remoteJid
  if (!remoteJid || remoteJid.endsWith('@g.us')) return // ignorar grupos

  const imageMessage = msg.message?.imageMessage || msg.message?.documentMessage
  const caption = msg.message?.imageMessage?.caption || msg.message?.conversation || ''
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''

  if (imageMessage) {
    const tipo = detectarTipo(caption) || 'compra'
    logger.info({ clienteId, tipo }, 'imagen recibida')

    const buffer = await downloadMediaMessage(msg, 'buffer', {})
    const imagenBase64 = buffer.toString('base64')

    const result = await postWebhook('/webhook/wpp/factura', {
      cliente_id: clienteId,
      tipo,
      imagen_base64: imagenBase64,
      remitente: remoteJid,
    })

    if (result.resumen_texto) {
      await sock.sendMessage(remoteJid, { text: result.resumen_texto })
    }
    return
  }

  if (text) {
    logger.info({ clienteId, text }, 'comando recibido')
    const result = await postWebhook('/webhook/wpp/comando', {
      cliente_id: clienteId,
      texto: text,
      remitente: remoteJid,
    })
    if (result.respuesta) {
      await sock.sendMessage(remoteJid, { text: result.respuesta })
    }
  }
}
