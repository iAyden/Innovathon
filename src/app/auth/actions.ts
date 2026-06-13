'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Helper function to translate Supabase errors to Spanish
function translateAuthError(error: Error | any): string {
  const msg = error?.message || '';
  
  if (msg.includes('Invalid login credentials')) {
    return 'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Debes confirmar tu correo electrónico antes de iniciar sesión.';
  }
  if (msg.includes('User already registered')) {
    return 'Este correo ya está registrado. Intenta iniciar sesión.';
  }
  if (msg.includes('Password should be at least 6 characters')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (msg.includes('invalid email format')) {
    return 'El formato del correo electrónico no es válido.';
  }
  if (msg.toLowerCase().includes('rate limit')) {
    return 'Has superado el límite de intentos. Por favor espera unos minutos antes de volver a intentar.';
  }
  
  // Default fallback
  return 'Ocurrió un error. Por favor intenta nuevamente. (' + msg + ')';
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function login(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'El correo y la contraseña son requeridos.' }
  }

  if (!isValidEmail(email)) {
    return { error: 'Por favor, ingresa un correo electrónico con un formato válido.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: translateAuthError(error) }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'El correo y la contraseña son requeridos.' }
  }

  if (!isValidEmail(email)) {
    return { error: 'Por favor, ingresa un correo electrónico con un formato válido.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { error: translateAuthError(error) }
  }

  // Creación de Multi-Tenant: Si el usuario se creó correctamente, creamos su organización base.
  if (data?.user) {
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: 'Mi Organización' })
      .select('id')
      .single()

    if (orgData && !orgError) {
      await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: data.user.id,
          role: 'owner'
        })
    } else {
      console.error("Error creating organization:", orgError)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
