import axios from 'axios'
import retry, {exponentialDelay, IAxiosRetryConfig, isNetworkOrIdempotentRequestError} from 'axios-retry'
import {Agent} from 'http'

import {MiddlewareContext} from '../context'

const http = axios.create({
  httpAgent: new Agent({
    keepAlive: true,
    maxFreeSockets: 50,
  }),
})

retry(http, {
  retries: 1,
  retryCondition: isNetworkOrIdempotentRequestError,
  retryDelay: exponentialDelay,
})

http.interceptors.response.use(response => response, (err: any) => {
  try {
    delete err.response.request
    delete err.response.config
    delete err.config.res
    delete err.config.data
  } catch (e) {} // tslint:disable-line
  return Promise.reject(err)
})

export const defaultsMiddleware = (baseURL: string | undefined, headers: Record<string, string>, timeout: number, retryConfig?: IAxiosRetryConfig) => {
  return async (ctx: MiddlewareContext, next: () => Promise<void>) => {
    ctx.config = {
      'axios-retry': retryConfig, // Allow overriding default retryConfig per-request
      baseURL,
      maxRedirects: 0,
      timeout,
      validateStatus: status => (status >= 200 && status < 300),
      ...ctx.config,
      headers: {
        ...headers,
        ...ctx.config.headers,
      },
    }

    await next()
  }
}

export const requestMiddleware = async (ctx: MiddlewareContext, next: () => Promise<void>) => {
  ctx.response = await http.request(ctx.config)
}
