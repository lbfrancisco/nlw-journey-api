import { formatDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import nodemailer from 'nodemailer'
import z from 'zod'
import { prisma } from '../lib/prisma'
import { getMailClient } from '../lib/mail'
import { NotFoundError } from './errors/not-found-error'
import { env } from '../env'

export async function createInvite(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/trips/:tripId/invites',
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        body: z.object({
          name: z.string().optional(),
          email: z.string().email(),
        }),
        response: {
          201: z.object({
            participantId: z.string().uuid(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { email, name } = request.body
      const { tripId } = request.params

      const trip = await prisma.trip.findUnique({
        where: {
          id: tripId,
        },
        include: {
          participants: true,
        },
      })

      if (!trip) {
        throw new NotFoundError('Trip not found.')
      }

      const participantAlreadyInvited = trip.participants.find(
        (participant) => participant.email === email,
      )

      if (participantAlreadyInvited) {
        throw new Error('This e-mail is already invited.')
      }

      const participant = await prisma.participant.create({
        data: {
          name,
          email,
          tripId,
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

      return reply.status(201).send({
        participantId: participant.id,
      })
    },
  )
}
