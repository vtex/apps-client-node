import { MiddlewareContext } from '../typings'
import { cacheKey, CacheType, isLocallyCacheable } from './cache'

export type Memoized = Required<Pick<MiddlewareContext, 'cacheHit' | 'response'>>

interface MemoizationOptions {
  memoizedCache: Map<string, Promise<Memoized>>
}

export const memoizationMiddleware = ({ memoizedCache }: MemoizationOptions) => {
  return async (ctx: MiddlewareContext, next: () => Promise<void>) => {
    if (!isLocallyCacheable(ctx.config, CacheType.Any) || !ctx.config.memoizable) {
      return await next()
    }

    const key = cacheKey(ctx.config)
    const isMemoized = !!memoizedCache.has(key)

    if (isMemoized) {
      const memoized = await memoizedCache.get(key)!
      ctx.memoizedHit = isMemoized
      ctx.response = memoized.response
    } else {
      const promise = new Promise<Memoized>(async (resolve, reject) => {
        try {
          await next()
          resolve({
            cacheHit: ctx.cacheHit!,
            response: ctx.response!,
          })
        } catch (err) {
          reject(err)
        }
      })
      memoizedCache.set(key, promise)
      await promise
    }
  }
}
