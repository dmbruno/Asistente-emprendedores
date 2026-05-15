import { CTAWaitlist } from "@/components/sections/CTAWaitlist";
import { ComoFunciona } from "@/components/sections/ComoFunciona";
import { Contacto } from "@/components/sections/Contacto";
import { FAQ } from "@/components/sections/FAQ";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { Navbar } from "@/components/sections/Navbar";
import { Nosotros } from "@/components/sections/Nosotros";
import { Pricing } from "@/components/sections/Pricing";
import { Problema } from "@/components/sections/Problema";
import { Servicios } from "@/components/sections/Servicios";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Problema />
      <Servicios />
      <ComoFunciona />
      <Pricing />
      <FAQ />
      <CTAWaitlist />
      <Nosotros />
      <Contacto />
      <Footer />
    </>
  );
}
