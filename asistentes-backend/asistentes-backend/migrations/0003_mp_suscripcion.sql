-- Migración 0003: columnas para suscripción con Mercado Pago
-- Agrega mp_preapproval_id y mp_plan_solicitado a la tabla clientes.

alter table public.clientes
    add column if not exists mp_preapproval_id    text    default null,
    add column if not exists mp_plan_solicitado   text    default null
        check (mp_plan_solicitado in ('solo', 'negocio') or mp_plan_solicitado is null);
