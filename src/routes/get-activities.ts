import { addDays, differenceInDays, isSameDay } from 'date-fns'
import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { prisma } from '../lib/prisma'
import { NotFoundError } from './errors/not-found-error'

export async function getActivities(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/trips/:tripId/activities',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            activities: z.array(
              z.object({
                date: z.date(),
                activities: z.array(
                  z.object({
                    id: z.string().uuid(),
                    title: z.string(),
                    occursAt: z.date(),
                    tripId: z.string().uuid(),
                  }),
                ),
              }),
            ),
          }),
        },
      },
    },
    async (request, reply) => {
      const { tripId } = request.params

      const trip = await prisma.trip.findUnique({
        where: {
          id: tripId,
        },
        include: {
          activities: {
            orderBy: {
              occursAt: 'asc',
            },
          },
        },
      })

      if (!trip) {
        throw new NotFoundError('Trip not found.')
      }

      const differenceInDaysBetweenTripStartAndEnd = differenceInDays(
        trip.endsAt,
        trip.startsAt,
      )

      const activities = Array.from({
        length: differenceInDaysBetweenTripStartAndEnd + 1,
      }).map((_, index) => {
        const date = addDays(trip.startsAt, index)

        return {
          date,
          activities: trip.activities.filter((activity) => {
            return isSameDay(activity.occursAt, date)
          }),
        }
      })

      return reply.send({
        activities,
      })
    },
  )
}
