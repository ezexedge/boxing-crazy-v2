"use server"

import { prisma } from "@/lib/db"
import { hashPassword, comparePassword, generateToken } from "@/lib/auth"
import { randomUUID } from "crypto"

/**
 * Registra un nuevo usuario
 */
export async function registerUser(data: {
  email: string
  password: string
  nombre: string
  apellido: string
}) {
  try {
    const { email, password, nombre, apellido } = data

    // Validar input
    if (!email || !password || !nombre || !apellido) {
      return { success: false, error: "Todos los campos son requeridos" }
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { success: false, error: "Email inválido" }
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return { success: false, error: "La contraseña debe tener al menos 6 caracteres" }
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return { success: false, error: "El email ya está registrado" }
    }

    // Hashear contraseña y crear usuario
    const hashedPassword = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        password: hashedPassword,
        nombre,
        apellido,
        role: "user",
        updatedAt: new Date(),
      },
    })

    // Generar token JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        role: user.role,
      },
    }
  } catch (error) {
    console.error("[Server Action] registerUser error:", error)
    return { success: false, error: "Error al registrar usuario" }
  }
}

/**
 * Inicia sesión de usuario
 */
export async function loginUser(data: { email: string; password: string }) {
  try {
    const { email, password } = data

    // Validar input
    if (!email || !password) {
      return { success: false, error: "Email y contraseña son requeridos" }
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return { success: false, error: "Credenciales inválidas" }
    }

    // Verificar contraseña
    const isValidPassword = await comparePassword(password, user.password)
    if (!isValidPassword) {
      return { success: false, error: "Credenciales inválidas" }
    }

    // Generar token JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        role: user.role,
      },
    }
  } catch (error) {
    console.error("[Server Action] loginUser error:", error)
    return { success: false, error: "Error al iniciar sesión" }
  }
}

/**
 * Obtiene información del usuario actual por ID
 */
export async function getUserById(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) {
      return { success: false, error: "Usuario no encontrado" }
    }

    return { success: true, user }
  } catch (error) {
    console.error("[Server Action] getUserById error:", error)
    return { success: false, error: "Error al obtener usuario" }
  }
}

/**
 * Actualiza información del usuario
 */
export async function updateUser(
  userId: string,
  data: {
    nombre?: string
    apellido?: string
    email?: string
  }
) {
  try {
    // Validar que al menos un campo esté presente
    if (!data.nombre && !data.apellido && !data.email) {
      return { success: false, error: "No hay datos para actualizar" }
    }

    // Si se actualiza email, verificar que no exista
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: userId },
        },
      })

      if (existingUser) {
        return { success: false, error: "El email ya está en uso" }
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        role: true,
      },
    })

    return { success: true, user }
  } catch (error) {
    console.error("[Server Action] updateUser error:", error)
    return { success: false, error: "Error al actualizar usuario" }
  }
}

/**
 * Cambia la contraseña del usuario
 */
export async function changePassword(
  userId: string,
  data: {
    currentPassword: string
    newPassword: string
  }
) {
  try {
    const { currentPassword, newPassword } = data

    // Validar input
    if (!currentPassword || !newPassword) {
      return { success: false, error: "Contraseña actual y nueva son requeridas" }
    }

    if (newPassword.length < 6) {
      return { success: false, error: "La nueva contraseña debe tener al menos 6 caracteres" }
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return { success: false, error: "Usuario no encontrado" }
    }

    // Verificar contraseña actual
    const isValidPassword = await comparePassword(currentPassword, user.password)
    if (!isValidPassword) {
      return { success: false, error: "Contraseña actual incorrecta" }
    }

    // Hashear y actualizar nueva contraseña
    const hashedPassword = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    return { success: true, message: "Contraseña actualizada correctamente" }
  } catch (error) {
    console.error("[Server Action] changePassword error:", error)
    return { success: false, error: "Error al cambiar contraseña" }
  }
}
