import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { prisma } from '../lib/prisma'
import { NotFoundError } from './errors/not-found-error'

export async function getLinks(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/trips/:tripId/links',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            links: z.array(
              z.object({
                id: z.string().uuid(),
                title: z.string(),
                url: z.string().url(),
                tripId: z.string().uuid(),
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
          links: true,
        },
      })

      if (!trip) {
        throw new NotFoundError('Trip not found.')
      }

      return reply.send({
        links: trip.links,
      })
    },
  )
}
