import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { prisma } from '../lib/prisma'
import { NotFoundError } from './errors/not-found-error'

export async function createLink(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/trips/:tripId/links',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        body: z.object({
          title: z.string().min(2),
          url: z.string().url(),
        }),
        response: {
          201: z.object({
            linkId: z.string().uuid(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { title, url } = request.body
      const { tripId } = request.params

      const trip = await prisma.trip.findUnique({
        where: {
          id: tripId,
        },
      })

      if (!trip) {
        throw new NotFoundError('Trip not found.')
      }

      const link = await prisma.link.create({
        data: {
          title,
          url,
          tripId,
        },
      })

      return reply.status(201).send({
        linkId: link.id,
      })
    },
  )
}
