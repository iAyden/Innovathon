import type { Metadata } from "next";
import { ProfileClient } from "./ProfileClient";

export const metadata: Metadata = {
  title: "Perfil del negocio",
};

export default function ProfilePage() {
  return <ProfileClient />;
}
