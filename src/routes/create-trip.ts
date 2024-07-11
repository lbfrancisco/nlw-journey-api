import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { prisma } from '../lib/prisma'
import { formatDate, isBefore } from 'date-fns'
import { getMailClient } from '../lib/mail'
import nodemailer from 'nodemailer'
import { ptBR } from 'date-fns/locale'
import { BadRequestError } from './errors/bad-request-error'
import { env } from '../env'

export async function createTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/trips',
    {
      schema: {
        body: z.object({
          destination: z.string().min(2),
          startsAt: z.coerce.date(),
          endsAt: z.coerce.date(),
          ownerName: z.string(),
          ownerEmail: z.string().email(),
          emailsToInvite: z.array(z.string().email()),
        }),
        response: {
          201: z.object({
            tripId: z.string().uuid(),
          }),
        },
      },
    },
    async (request, reply) => {
      const {
        destination,
        startsAt,
        endsAt,
        ownerName,
        ownerEmail,
        emailsToInvite,
      } = request.body

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

      const participants = emailsToInvite.map((email) => {
        return {
          email,
        }
      })

      const trip = await prisma.trip.create({
        data: {
          destination,
          startsAt,
          endsAt,
          participants: {
            createMany: {
              data: [
                {
                  name: ownerName,
                  email: ownerEmail,
                  isOwner: true,
                  isConfirmed: true,
                },
                ...participants,
              ],
            },
          },
        },
      })

      const confirmationLink = `${env.API_BASE_URL}/trips/${trip.id}/confirm`

      const formattedStartDate = formatDate(startsAt, 'dd de LLLL de yyyy', {
        locale: ptBR,
      })

      const formattedEndDate = formatDate(endsAt, 'dd de LLLL de yyyy', {
        locale: ptBR,
      })

      const mail = await getMailClient()

      const message = await mail.sendMail({
        from: {
          name: 'Equipe plann.er',
          address: 'oi@plann.er',
        },
        to: {
          name: ownerName,
          address: ownerEmail,
        },
        subject: `Confirme sua viagem para ${destination}`,
        html: `
        <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6">
          <p>Você solicitou a criação de uma viagem para <strong>${destination}</strong> entre as datas de <strong>${formattedStartDate}</strong> à <strong>${formattedEndDate}</strong>.</p>
          <p></p>
          <p>Para confirmar sua viagem, clique no link abaixo:</p>
          <p></p>
          <p><a href="${confirmationLink}">Confirmar viagem</a></p>
          <p></p>
          <p>Caso você não saiba do que se trata esse e-mail, apenas ignore.</p>
        </div>
        `.trim(),
      })

      console.log(nodemailer.getTestMessageUrl(message))

      return reply.status(201).send({
        tripId: trip.id,
      })
    },
  )
}
