import type { Metadata } from "next";
import { ThemeClient } from "./ThemeClient";

export const metadata: Metadata = {
  title: "Personalizar Apariencia",
  description: "Personaliza los colores y el diseño visual de tu organización.",
};

export default function ThemePage() {
  return <ThemeClient />;
}
