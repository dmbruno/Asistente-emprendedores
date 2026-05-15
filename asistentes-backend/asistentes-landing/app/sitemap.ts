import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://asistentes.example";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const rutas = [
    "",
    "/servicios/facturacion",
    "/sobre-nosotros",
    "/precios",
    "/contacto",
  ];
  return rutas.map((ruta) => ({
    url: `${SITE_URL}${ruta}`,
    lastModified,
    changeFrequency: "weekly",
    priority: ruta === "" ? 1 : 0.7,
  }));
}
