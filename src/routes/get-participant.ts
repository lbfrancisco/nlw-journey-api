import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { prisma } from '../lib/prisma'
import { NotFoundError } from './errors/not-found-error'

export async function getParticipant(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/participants/:participantId',
    {
      schema: {
        params: z.object({
          participantId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            participant: z.object({
              id: z.string().uuid(),
              name: z.string().nullable(),
              email: z.string().email(),
              isConfirmed: z.boolean(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { participantId } = request.params

      const participant = await prisma.participant.findUnique({
        where: {
          id: participantId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          isConfirmed: true,
        },
      })

      if (!participant) {
        throw new NotFoundError('Trip not found.')
      }

      return reply.send({
        participant,
      })
    },
  )
}
