import { Contacto } from "@/components/sections/Contacto";
import { Footer } from "@/components/sections/Footer";
import { HeroMarketplace } from "@/components/sections/HeroMarketplace";
import { Navbar } from "@/components/sections/Navbar";
import { Nosotros } from "@/components/sections/Nosotros";
import { Servicios } from "@/components/sections/Servicios";

/**
 * Home — vista marketplace.
 *
 * Cada agente tiene su propia página de detalle en /servicios/<slug>:
 *   - /servicios/facturacion → Agente Contable
 *   - /servicios/atencion    → Asistente de Atención al Cliente
 *
 * Acá solo mostramos el catálogo de agentes y los CTAs hacia el detalle.
 * Los componentes específicos (ComoFunciona, Pricing, FAQ, CTAWaitlist)
 * viven en las páginas de cada agente, no en la home.
 */
export default function Home() {
  return (
    <>
      <Navbar />
      <HeroMarketplace />
      <Servicios />
      <Nosotros />
      <Contacto />
      <Footer />
    </>
  );
}
