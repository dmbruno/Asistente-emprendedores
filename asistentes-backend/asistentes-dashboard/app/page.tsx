import { redirect } from "next/navigation";

export default function Home() {
  // TODO: chequear sesión y redirigir a /dashboard si está logueado.
  redirect("/login");
}
