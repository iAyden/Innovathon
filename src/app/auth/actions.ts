"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
};

function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "";
}

function translateAuthError(error: unknown) {
  const message = errorMessage(error);

  if (message.includes("Invalid login credentials")) {
    return "Correo o contrasena incorrectos.";
  }
  if (message.includes("Email not confirmed")) {
    return "Confirma tu correo antes de iniciar sesion.";
  }
  if (message.includes("User already registered")) {
    return "Este correo ya esta registrado.";
  }
  if (message.includes("Password should be at least")) {
    return "La contrasena debe tener al menos 8 caracteres.";
  }
  if (message.toLowerCase().includes("rate limit")) {
    return "Superaste el limite de intentos. Espera unos minutos.";
  }
  return "No se pudo completar la operacion. Intenta nuevamente.";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function login(
  _previousState: AuthState | undefined,
  formData: FormData,
): Promise<AuthState | undefined> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!isValidEmail(email) || !password) {
    return { error: "Ingresa un correo y contrasena validos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translateAuthError(error) };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(
  _previousState: AuthState | undefined,
  formData: FormData,
): Promise<AuthState | undefined> {
  const businessName = String(formData.get("businessName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!businessName) {
    return { error: "Escribe el nombre de tu negocio." };
  }
  if (!isValidEmail(email)) {
    return { error: "Ingresa un correo valido." };
  }
  if (password.length < 8) {
    return { error: "La contrasena debe tener al menos 8 caracteres." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { business_name: businessName } },
  });

  if (error) {
    return { error: translateAuthError(error) };
  }

  if (data.user) {
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .insert({ name: businessName })
      .select("id")
      .single();

    if (organization && !organizationError) {
      await supabase.from("organization_members").insert({
        organization_id: organization.id,
        user_id: data.user.id,
        role: "owner",
      });
    } else {
      console.error("Error creating organization:", organizationError);
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error closing session in Supabase:', error)
    }
  } catch (e) {
    console.error('Unexpected error during logout:', e)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
