import type { Metadata } from "next";
import { CTAWaitlist } from "@/components/sections/CTAWaitlist";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Sumate a la lista de espera o escribinos.",
};

export default function ContactoPage() {
  return (
    <main className="px-4 py-12">
      <CTAWaitlist />
    </main>
  );
}
