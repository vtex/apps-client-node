import { MiddlewareContext } from '../typings'
import { cacheKey, CacheType, isLocallyCacheable } from './cache'

export type Memoized = Required<Pick<MiddlewareContext, 'cacheHit' | 'response'>>

interface MemoizationOptions {
  memoizedCache: Map<string, Promise<Memoized>>
}

export const memoizationMiddleware = ({memoizedCache}: MemoizationOptions) => {
  return async (ctx: MiddlewareContext, next: () => Promise<void>) => {
    if (!isLocallyCacheable(ctx.config, CacheType.Any) || !ctx.config.memoizable) {
      return await next()
    }

    const key = cacheKey(ctx.config)
    const isMemoized = memoizedCache.has(key) ? 1 : 0
    ctx.cacheHit = {
      ...ctx.cacheHit,
      inflight: isMemoized,
    }

    if (isMemoized) {
      const memoized = await memoizedCache.get(key)!
      ctx.cacheHit = {
        ...memoized.cacheHit,
        memoized: 1,
      }
      ctx.response = memoized.response
      return
    } else {
      const promise = new Promise<Memoized>((resolve, reject) => {
        next().then(() => {
          resolve({
            cacheHit: ctx.cacheHit!,
            response: ctx.response!,
          })
        }).catch(reject)
      })
      memoizedCache.set(key, promise)
      await promise
    }
  }
}
