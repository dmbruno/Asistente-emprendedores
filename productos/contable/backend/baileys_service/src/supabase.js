// Cliente Supabase para persistir sesiones Baileys (Storage).

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const BUCKET = 'baileys-sessions'

let client = null

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase no configurado en el servicio Baileys')
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  }
  return client
}

export async function saveSession(clienteId, _state) {
  // TODO:
  // 1. serializar state a JSON
  // 2. encriptar con MASTER_KEY (mismo Fernet que el backend Python; usar
  //    una librería compatible o un AES-GCM equivalente)
  // 3. supabase.storage.from(BUCKET).upload(`${clienteId}.dat`, encrypted, { upsert: true })
  void clienteId
}

export async function loadSession(clienteId) {
  // TODO: download del bucket → desencriptar → escribir al filesystem local
  // ANTES de invocar useMultiFileAuthState.
  void clienteId
  return null
}

export async function listClientesActivos() {
  // TODO: select id from clientes where activo=true and exists fila en sesiones_baileys
  return []
}

export { getClient }
