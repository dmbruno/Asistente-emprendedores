/**
 * Esquemas Zod compartidos entre el form (cliente) y la API route (server).
 *
 * Tener UN solo schema evita que se vayan desfasando los campos entre el
 * front y el back.
 */
import { z } from "zod";

// ────────────────────────────────────────────────────────────────────────
// Contratación: Asistente de Atención
// ────────────────────────────────────────────────────────────────────────

export const RUBROS = [
  "Agencia de viajes",
  "Taller mecánico",
  "Inmobiliaria",
  "Restaurante / Delivery",
  "Gimnasio / Estética",
  "E-commerce",
  "Servicios profesionales",
  "Otro",
] as const;

export const ContratacionAtencionSchema = z.object({
  // Datos de contacto
  nombre: z
    .string()
    .min(2, "Ingresá tu nombre")
    .max(80, "Máximo 80 caracteres"),
  email: z
    .string()
    .email("Email inválido")
    .max(120, "Máximo 120 caracteres"),
  whatsapp: z
    .string()
    .min(8, "Ingresá tu WhatsApp con código de país")
    .max(25, "Máximo 25 caracteres"),

  // Negocio
  negocio: z
    .string()
    .min(2, "Ingresá el nombre de tu negocio")
    .max(120, "Máximo 120 caracteres"),
  rubro: z.enum(RUBROS, {
    errorMap: () => ({ message: "Elegí un rubro" }),
  }),

  // Bot
  personalidadBot: z
    .string()
    .min(10, "Contanos un poco más (mínimo 10 caracteres)")
    .max(400, "Máximo 400 caracteres"),
  ideaServicio: z
    .string()
    .min(20, "Contanos un poco más (mínimo 20 caracteres)")
    .max(2000, "Máximo 2000 caracteres"),

  // Honeypot anti-spam (campo invisible que solo bots llenan)
  website: z.string().max(0).optional(),
});

export type ContratacionAtencionInput = z.infer<typeof ContratacionAtencionSchema>;
