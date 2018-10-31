import {AxiosResponse} from 'axios'
import {IncomingMessage} from 'http'
import {Context} from 'koa'
import * as compose from 'koa-compose'

import {MetricsAccumulator} from '../MetricsAccumulator'

import {CacheLayer} from '../caches/CacheLayer'
import {MiddlewareContext, RequestConfig} from './context'
import {CacheableRequestConfig, Cached, cacheMiddleware} from './middlewares/cache'
import {metricsMiddleware} from './middlewares/metrics'
import {acceptNotFoundMiddleware, notFoundFallbackMiddleware} from './middlewares/notFound'
import {Recorder, recorderMiddleware} from './middlewares/recorder'
import {defaultsMiddleware, getAxiosInstance, requestMiddleware} from './middlewares/request'

const DEFAULT_TIMEOUT_MS = 10000
const noTransforms = [(data: any) => data]

const rootURL = (service: string, {region}: IOContext, {endpoint}: InstanceOptions): string => {
  if (endpoint) {
    return 'http://' + endpoint
  }

  if (region) {
    return `http://${service}.${region}.vtex.io`
  }

  throw new Error('Missing required: should specify either {region} or {endpoint}')
}

const workspaceURL = (service: string, context: IOContext, opts: InstanceOptions): string => {
  const {account, workspace} = context
  if (!account || !workspace) {
    throw new Error('Missing required arguments: {account, workspace}')
  }

  return rootURL(service, context, opts) + `/${account}/${workspace}`
}

export class HttpClient {

  public static forWorkspace (service: string, context: IOContext, opts: InstanceOptions): HttpClient {
    const {authToken, userAgent, recorder} = context
    const {timeout, cacheStorage} = opts
    const baseURL = workspaceURL(service, context, opts)
    return new HttpClient({baseURL, authType: AuthType.bearer, authToken, userAgent, timeout, recorder, cacheStorage})
  }

  public static forRoot (service: string, context: IOContext, opts: InstanceOptions): HttpClient {
    const {authToken, userAgent, recorder} = context
    const {timeout, cacheStorage} = opts
    const baseURL = rootURL(service, context, opts)
    return new HttpClient({baseURL, authType: AuthType.bearer, authToken, userAgent, timeout, recorder, cacheStorage})
  }

  public static forLegacy (endpoint: string, opts: LegacyInstanceOptions): HttpClient {
    const {authToken, userAgent, timeout, cacheStorage} = opts
    return new HttpClient({baseURL: endpoint, authType: AuthType.token, authToken, userAgent, timeout, cacheStorage})
  }
  private runMiddlewares: compose.ComposedMiddleware<MiddlewareContext>

  public constructor (opts: ClientOptions) {
    const {baseURL, authToken, authType, cacheStorage, metrics, recorder, retries = 3, userAgent, timeout = DEFAULT_TIMEOUT_MS} = opts
    const headers: Record<string, string> = {
      'Accept-Encoding': 'gzip',
      'User-Agent': userAgent,
    }

    if (authType && authToken) {
      headers['Authorization'] = `${authType} ${authToken}` // tslint:disable-line
    }

    const axiosInstance = getAxiosInstance(retries)

    this.runMiddlewares = compose([
      defaultsMiddleware(baseURL, headers, timeout),
      ...recorder ? [recorderMiddleware(recorder)] : [],
      acceptNotFoundMiddleware,
      ...cacheStorage ? [cacheMiddleware(cacheStorage)] : [],
      notFoundFallbackMiddleware,
      ...metrics ? [metricsMiddleware(metrics)] : [],
      requestMiddleware(axiosInstance),
    ])
  }

  public get = <T = any>(url: string, config: RequestConfig = {}): Promise<T> => {
    const cacheableConfig = {...config, url, cacheable: true} as CacheableRequestConfig
    return this.request(cacheableConfig).then(response => response.data as T)
  }

  public getRaw = <T = any>(url: string, config: RequestConfig = {}): Promise<IOResponse<T>> => {
    const cacheableConfig = {...config, url, cacheable: true} as CacheableRequestConfig
    return this.request(cacheableConfig) as Promise<IOResponse<T>>
  }

  public getBuffer = (url: string, config: RequestConfig = {}): Promise<{data: Buffer, headers: any}> => {
    const bufferConfig = {...config, url, responseType: 'arraybuffer', transformResponse: noTransforms}
    return this.request(bufferConfig)
  }

  public getStream = (url: string, config: RequestConfig = {}): Promise<IncomingMessage> => {
    const streamConfig = {...config, url, responseType: 'stream', transformResponse: noTransforms}
    return this.request(streamConfig).then(response => response.data as IncomingMessage)
  }

  public put = <T = void>(url: string, data?: any, config: RequestConfig = {}): Promise<T> => {
    const putConfig: RequestConfig = {...config, url, data, method: 'put'}
    return this.request(putConfig).then(response => response.data as T)
  }

  public post = <T = void>(url: string, data?: any, config: RequestConfig = {}): Promise<T> => {
    const postConfig: RequestConfig = {...config, url, data, method: 'post'}
    return this.request(postConfig).then(response => response.data as T)
  }

  public postRaw = <T = void>(url: string, data?: any, config: RequestConfig = {}): Promise<IOResponse<T>> => {
    const postConfig: RequestConfig = {...config, url, data, method: 'post'}
    return this.request(postConfig) as Promise<IOResponse<T>>
  }

  public patch = <T = void>(url: string, data?: any, config: RequestConfig = {}): Promise<T> => {
    const patchConfig: RequestConfig = {...config, url, data, method: 'patch'}
    return this.request(patchConfig).then(response => response.data as T)
  }

  public delete = (url: string, config?: RequestConfig): Promise<IOResponse<void>> => {
    const deleteConfig: RequestConfig = {...config, url, method: 'delete'}
    return this.request(deleteConfig)
  }

  private request = async (config: RequestConfig): Promise<AxiosResponse> => {
    const context: MiddlewareContext = {config}
    await this.runMiddlewares(context)
    return context.response!
  }
}

export const withoutRecorder = (ioContext: IOContext): IOContext => {
  return {...ioContext, recorder: undefined}
}

export type CacheStorage = CacheLayer<string, Cached>

export type Recorder = Recorder

export interface ServiceContext extends Context {
  vtex: IOContext
}

export interface IOContext {
  account: string,
  authToken: string,
  production: boolean,
  recorder?: Recorder,
  region: string,
  route: {
    declarer: string
    id: string
    params: {
      [param: string]: string
    }
  }
  userAgent: string,
  workspace: string,
}

export interface InstanceOptions {
  timeout?: number,
  cacheStorage?: CacheLayer<string, Cached>,
  endpoint?: string,
}

export interface LegacyInstanceOptions {
  authToken: string,
  userAgent: string,
  timeout?: number,
  accept?: string,
  cacheStorage?: CacheLayer<string, Cached>,
}

export interface IOResponse<T> {
  data: T
  headers: any
  status: number
}

enum AuthType {
  bearer = 'bearer',
  token = 'token',
}

interface ClientOptions {
  authType?: AuthType,
  authToken?: string,
  userAgent: string
  baseURL?: string,
  timeout?: number,
  recorder?: Recorder,
  retries?: number,
  metrics?: MetricsAccumulator,
  cacheStorage?: CacheLayer<string, Cached>,
}
