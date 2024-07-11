import { isBefore } from 'date-fns'
import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { prisma } from '../lib/prisma'
import { BadRequestError } from './errors/bad-request-error'
import { NotFoundError } from './errors/not-found-error'

export async function updateTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().put(
    '/trips/:tripId',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        body: z.object({
          destination: z.string().min(2),
          startsAt: z.coerce.date(),
          endsAt: z.coerce.date(),
        }),
        response: {
          204: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { destination, startsAt, endsAt } = request.body
      const { tripId } = request.params

      const trip = await prisma.trip.findUnique({
        where: {
          id: tripId,
        },
      })

      if (!trip) {
        throw new NotFoundError('Trip not found.')
      }

      if (isBefore(startsAt, new Date())) {
        throw new BadRequestError(
          'The start date must be greater than or equal to the current date.',
        )
      }

      if (isBefore(endsAt, startsAt)) {
        throw new BadRequestError(
          'The end date must be greater than or equal to the start date.',
        )
      }

      await prisma.trip.update({
        where: {
          id: tripId,
        },
        data: {
          destination,
          startsAt,
          endsAt,
        },
      })

      return reply.status(204).send()
    },
  )
}
