import { formatDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import nodemailer from 'nodemailer'
import z from 'zod'
import { getMailClient } from '../lib/mail'
import { prisma } from '../lib/prisma'
import { NotFoundError } from './errors/not-found-error'
import { env } from '../env'

export async function confirmTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/trips/:tripId/confirm',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { tripId } = request.params

      const trip = await prisma.trip.findUnique({
        where: {
          id: tripId,
        },
        include: {
          participants: {
            where: {
              isOwner: false,
            },
          },
        },
      })

      if (!trip) {
        throw new NotFoundError('Trip not found.')
      }

      if (trip.isConfirmed) {
        return reply.redirect(`${env.FRONT_END_BASE_URL}/trips/${tripId}`)
      }

      await prisma.trip.update({
        where: {
          id: tripId,
        },
        data: {
          isConfirmed: true,
        },
      })

      const formattedStartDate = formatDate(
        trip.startsAt,
        `dd 'de' LLLL 'de' yyyy`,
        {
          locale: ptBR,
        },
      )

      const formattedEndDate = formatDate(
        trip.endsAt,
        `dd 'de' LLLL 'de' yyyy`,
        {
          locale: ptBR,
        },
      )

      const mail = await getMailClient()

      await Promise.all([
        trip.participants.map(async (participant) => {
          const confirmationLink = `${env.API_BASE_URL}/participants/${participant.id}/confirm`

          const message = await mail.sendMail({
            from: {
              name: 'Equipe plann.er',
              address: 'oi@plann.er',
            },
            to: participant.email,
            subject: `Confirme sua presença na viagem para ${trip.destination}`,
            html: `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6">
              <p>Você foi convidado(a) para participar de uma viagem para <strong>${trip.destination}</strong> entre as datas de <strong>${formattedStartDate}</strong> à <strong>${formattedEndDate}</strong>.</p>
              <p></p>
              <p>Para confirmar sua presença na viagem, clique no link abaixo:</p>
              <p></p>
              <p><a href="${confirmationLink}">Confirmar presença</a></p>
              <p></p>
              <p>Caso você não saiba do que se trata esse e-mail, apenas ignore.</p>
            </div>
            `.trim(),
          })

          console.log(nodemailer.getTestMessageUrl(message))
        }),
      ])

      return reply.redirect(`${env.FRONT_END_BASE_URL}/trips/${tripId}`)
    },
  )
}
