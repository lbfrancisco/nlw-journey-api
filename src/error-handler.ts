import type { FastifyInstance } from 'fastify'
import { NotFoundError } from './routes/errors/not-found-error'
import { ZodError } from 'zod'
import { BadRequestError } from './routes/errors/bad-request-error'

type FastifyErrorHandler = FastifyInstance['errorHandler']

export const errorHandler: FastifyErrorHandler = (error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation error',
      errors: error.flatten().fieldErrors,
    })
  }

  if (error instanceof NotFoundError) {
    return reply.status(400).send({
      message: error.message,
    })
  }

  if (error instanceof BadRequestError) {
    return reply.status(400).send({
      message: error.message,
    })
  }

  console.log(error)

  return reply.status(500).send({ message: 'Internal Server Error' })
}
