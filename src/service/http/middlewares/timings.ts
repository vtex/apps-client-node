import { IOClients } from '../../../clients/IOClients'
import { statusLabel } from '../../../utils/status'
import {
  formatTimingName,
  hrToMillis,
  reduceTimings,
  shrinkTimings,
} from '../../../utils/time'
import { updateLastLogger } from '../../../utils/unhandled'
import { ServiceContext } from '../../typings'

const APP_ELAPSED_TIME_LOCATOR = shrinkTimings(
  formatTimingName({
    hopNumber: 0,
    source: process.env.VTEX_APP_NAME!,
    target: '',
  })
)

const log = <T extends IOClients, U, V>(
  {
    vtex: {
      account,
      workspace,
      route: { id },
    },
    path,
    method,
    status,
    req: { headers },
  }: ServiceContext<T, U, V>,
  millis: number
) =>
  // `${new Date().toISOString()}\t${account}/${workspace}:${id}\t${status}\t${method}\t${path}\t${millis}ms`
  `${new Date().toISOString()}\t${account}/${workspace}:${id}\t${status}\t${method}\t${path}\t${millis}ms\t caller: ${JSON.stringify(
    headers['user-agent']
  )}`

export async function timings<T extends IOClients, U, V>(
  ctx: ServiceContext<T, U, V>,
  next: () => Promise<any>
) {
  const start = process.hrtime()

  updateLastLogger(ctx.clients.logger)

  // Errors will be caught by the next middleware so we don't have to catch.
  await next()

  const {
    status,
    vtex: {
      route: { id },
    },
  } = ctx
  const end = process.hrtime(start)
  const millis = hrToMillis(end)
  console.log(log(ctx, millis))

  metrics.batch(`http-handler-${statusLabel(status)}-${id}`, end, {
    [status]: 1,
  })
  ctx.serverTiming![APP_ELAPSED_TIME_LOCATOR] = `${millis}`
  ctx.set('Server-Timing', reduceTimings(ctx.serverTiming!))
}
