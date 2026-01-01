import { z } from "zod"

export const billingAddressSchema = z.object({
  email: z
    .string()
    .min(1, "El email es requerido")
    .email("Email inválido"),
  country: z
    .string()
    .min(1, "El país es requerido"),
  firstName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede tener más de 50 caracteres"),
  lastName: z
    .string()
    .min(2, "El apellido debe tener al menos 2 caracteres")
    .max(50, "El apellido no puede tener más de 50 caracteres"),
  company: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || val === "" || val.length <= 100,
      "El nombre de la empresa no puede tener más de 100 caracteres"
    ),
  addressLine1: z
    .string()
    .min(5, "La dirección debe tener al menos 5 caracteres")
    .max(100, "La dirección no puede tener más de 100 caracteres"),
  addressLine2: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || val === "" || val.length <= 100,
      "La dirección no puede tener más de 100 caracteres"
    ),
  postalCode: z
    .string()
    .min(3, "El código postal debe tener al menos 3 caracteres")
    .max(10, "El código postal no puede tener más de 10 caracteres"),
  city: z
    .string()
    .min(2, "La ciudad debe tener al menos 2 caracteres")
    .max(50, "La ciudad no puede tener más de 50 caracteres"),
  province: z
    .string()
    .min(2, "La provincia debe tener al menos 2 caracteres")
    .max(50, "La provincia no puede tener más de 50 caracteres"),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || val === "" || /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(val),
      "Número de teléfono inválido"
    ),
})

export type BillingAddress = z.infer<typeof billingAddressSchema>
