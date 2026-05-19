-- Migración 002: columnas de plan y cuota en travel_user_configs
-- Aplicar en Supabase SQL Editor (o via supabase db push si está linkeado)

ALTER TABLE travel_user_configs
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS mp_preapproval_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_plan_solicitado TEXT,
  ADD COLUMN IF NOT EXISTS cotizaciones_mes INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cotizaciones_mes_reset DATE;

-- Índice para consultas por user_id + plan (frecuente en el check de cuota)
CREATE INDEX IF NOT EXISTS idx_travel_user_configs_plan
  ON travel_user_configs (user_id, plan);
