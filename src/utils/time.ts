import { compose, forEach, keys, reduce, toPairs } from 'ramda'

import { IOClients } from '../clients/IOClients'
import { RouteHandler, ServiceContext } from '../service/typings'

export const hrToMillis = ([seconds, nanoseconds]: [number, number]) =>
  Math.round((seconds * 1e3) + (nanoseconds / 1e6))

export const hrToNano = ([seconds, nanoseconds]: [number, number]) =>
  seconds * 1e9 + nanoseconds

export const formatNano = (nanoseconds: number): string =>
  `${(nanoseconds / 1e9).toFixed(0)}s ${((nanoseconds / 1e6) % 1e3).toFixed(0)}ms`

export const reduceHrToNano =
  reduce((acc: number, hr: [number, number]) => acc + hrToNano(hr), 0 as number)

export const shrinkTimings = (name: string) => name.replace(/graphql/g, 'gql').replace(/server/g, 'srv')

type TimingFormat = ReturnType<typeof parseTimingName>

export const formatTimingName = ({hopNumber, target, source}: TimingFormat) =>
  `${Number.isNaN(hopNumber as any) ? '' : hopNumber}.${source || ''}#${target || ''}`

export const parseTimingName = (timing: string | undefined) => {
  const [hopNumber, sourceAndTarget] = timing ? timing.split('.') : [null, null]
  const [source, target] = sourceAndTarget ? sourceAndTarget.split('#') : [null, null]
  return {
    hopNumber: Number.isNaN(hopNumber as any) ? null : Number(hopNumber),
    source,
    target,
  }
}

export const reduceTimings = (timingsObj: Record<string, string>) => compose<Record<string, string>, Array<[string, string]>, string>(
  reduce((acc, [key, dur]) => `${key};dur=${dur}, ${acc}`, ''),
  toPairs
)(timingsObj)

function recordTimings(start: [number, number], name: string, timings: Record<string, [number, number]>, middlewareMetrics: Record<string, [number, number]>) {
  // Capture the total amount of time spent in this middleware
  const end = process.hrtime(start)
  timings[name] = end
  const label = `middleware-${name}`
  metrics.batch(label, end)

  // This middleware has added it's own metrics
  // Just add them to `timings` scoped by the middleware's name and batch them
  const middlewareMetricsKeys: string[] = keys(middlewareMetrics) as string[]
  if (middlewareMetricsKeys.length > 0) {
    forEach((k: string) => {
      const metricEnd = middlewareMetrics[k]
      const metricName = `${label}-${k}`
      timings[metricName] = metricEnd
      metrics.batch(metricName, metricEnd)
    }, middlewareMetricsKeys)
  }
}

export function timer<T extends IOClients, U, V>(middleware: RouteHandler<T, U, V>): RouteHandler<T, U, V> {
  if ((middleware as any).skipTimer) {
    return middleware
  }

  if (!middleware.name) {
    console.warn('Please use a named function as handler for better metrics.', middleware.toString())
  }

  return async (ctx: ServiceContext<T, U, V>, next: () => Promise<any>) => {
    if (!ctx.serverTiming) {
      ctx.serverTiming = {}
    }
    if (!ctx.timings) {
      ctx.timings = {}
    }
    if (!ctx.metrics) {
      ctx.metrics = {}
    }
    const start = process.hrtime()
    try {
      await middleware(ctx, async () => {
        recordTimings(start, middleware.name, ctx.timings, ctx.metrics)
        ctx.metrics = {}
        if (next) {
          await next()
        }
      })
    } catch (e) {
      recordTimings(start, middleware.name, ctx.timings, ctx.metrics)
      throw e
    }
  }
}
