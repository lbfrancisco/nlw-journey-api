import fastifyCors from '@fastify/cors'
import fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import { confirmParticipant } from './routes/confirm-participant'
import { confirmTrip } from './routes/confirm-trip'
import { createActivity } from './routes/create-activity'
import { createInvite } from './routes/create-invite'
import { createLink } from './routes/create-link'
import { createTrip } from './routes/create-trip'
import { getActivities } from './routes/get-activities'
import { getLinks } from './routes/get-links'
import { getParticipants } from './routes/get-participants'
import { getTripDetails } from './routes/get-trip-details'
import { updateTrip } from './routes/update-trip'
import { getParticipant } from './routes/get-participant'
import { errorHandler } from './error-handler'

export const app = fastify()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(fastifyCors, {
  origin: '*',
})

app.setErrorHandler(errorHandler)

/** Trip */
app.register(createTrip)
app.register(confirmTrip)
app.register(confirmParticipant)
app.register(updateTrip)
app.register(getTripDetails)

/** Activity */
app.register(createActivity)
app.register(getActivities)

/** Link */
app.register(createLink)
app.register(getLinks)

/** Participants */
app.register(getParticipants)
app.register(getParticipant)
app.register(createInvite)
