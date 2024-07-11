import z from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_BASE_URL: z.string().url(),
  FRONT_END_BASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3333),
})

export const env = envSchema.parse(process.env)
