import type { Metadata } from "next";
import { Pricing } from "@/components/sections/Pricing";

export const metadata: Metadata = {
  title: "Precios",
  description: "Planes y precios. Probás gratis y cancelás cuando quieras.",
};

export default function PreciosPage() {
  return <Pricing />;
}
