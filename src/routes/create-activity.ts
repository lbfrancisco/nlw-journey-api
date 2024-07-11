import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { prisma } from '../lib/prisma'
import { isBefore } from 'date-fns'
import { NotFoundError } from './errors/not-found-error'

export async function createActivity(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/trips/:tripId/activities',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        body: z.object({
          title: z.string().min(2),
          occursAt: z.coerce.date(),
        }),
        response: {
          201: z.object({
            activityId: z.string().uuid(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { title, occursAt } = request.body
      const { tripId } = request.params

      const trip = await prisma.trip.findUnique({
        where: {
          id: tripId,
        },
      })

      if (!trip) {
        throw new NotFoundError('Trip not found.')
      }

      if (isBefore(occursAt, trip.startsAt)) {
        throw new Error(
          'The occurs date of the activity must be after the start date of the trip.',
        )
      }

      const activity = await prisma.activity.create({
        data: {
          title,
          occursAt,
          tripId,
        },
      })

      return reply.status(201).send({
        activityId: activity.id,
      })
    },
  )
}
