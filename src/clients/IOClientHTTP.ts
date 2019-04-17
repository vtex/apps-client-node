import { DataSourceConfig } from 'apollo-datasource'

import { HttpClient, InstanceOptions } from '../HttpClient'
import { IOContext, ServiceContext } from '../service/typings'
import { IOClient } from './IOClient'

interface HttpClientFactoryOptions {
  service: string | void
  context: IOContext | void
  options: InstanceOptions | void
}

export type HttpClientFactory = (opts: HttpClientFactoryOptions) => HttpClient | void

export abstract class IOClientHTTP extends IOClient {
  protected abstract httpClientFactory: HttpClientFactory
  protected service: string | void = undefined
  private httpClient: HttpClient | void = undefined
  private initialized = false

  constructor (
    protected context?: IOContext,
    protected options: InstanceOptions = {}
  ) {
    super(context)
  }

  public initialize(config: DataSourceConfig<ServiceContext>) {
    const {context: {vtex: context}, cache: cacheStorage} = config
    this.context = context
    this.httpClient = this.httpClientFactory({
      context,
      options: {cacheStorage, ...this.options} as any,
      service: this.service,
    })
    this.initialized = true
  }

  get http(): HttpClient {
    if (!this.initialized) {
      this.initialize({context: {vtex: this.context}} as any)
    }
    if (this.httpClient) {
      return this.httpClient
    }
    throw new Error('IO Datasource was not initialized nor constructed with a context')
  }
}

export const IODataSource = IOClientHTTP

export const forWorkspace: HttpClientFactory = ({context, service, options}) => (context && service)
  ? HttpClient.forWorkspace(service, context, options || {})
  : undefined

export const forRoot: HttpClientFactory = ({context, service, options}) => (context && service)
  ? HttpClient.forRoot(service, context, options || {})
  : undefined

export const forExternal: HttpClientFactory = ({context, service, options}) => (context && service)
  ? HttpClient.forExternal(service, context, options || {} as any)
  : undefined
