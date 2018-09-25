import * as stringify from 'json-stringify-safe'
import {pick} from 'ramda'

import {HttpClient, InstanceOptions, IOContext, withoutRecorder} from './HttpClient'

const DEFAULT_SUBJECT = '-'
const PICKED_AXIOS_PROPS = ['baseURL', 'cacheable', 'data', 'finished', 'headers', 'method', 'timeout', 'status', 'path', 'url']

const routes = {
  Event: (route: string) => `/events/${route}`,
  Log: (level: string) => `/logs/${level}`,
  Metric: () => `/metrics`,
}

const errorReplacer = (key: string, value: any) => {
  if (key.startsWith('_')) {
    return undefined
  }
  if (value && typeof value === 'string' && value.length > 1024) {
    return value.substr(0, 256) + '[...TRUNCATED]'
  }
  return value
}

export class Colossus {
  private http: HttpClient

  constructor (ioContext: IOContext, opts: InstanceOptions = {}) {
    this.http = HttpClient.forWorkspace('colossus', withoutRecorder(ioContext), opts)
  }

  public debug = (message: any, subject: string = DEFAULT_SUBJECT) =>
    this.sendLog(subject, message, 'debug')

  public info = (message: any, subject: string = DEFAULT_SUBJECT) =>
    this.sendLog(subject, message, 'info')

  public warn = (message: any, subject: string = DEFAULT_SUBJECT) =>
    this.sendLog(subject, message, 'warn')

  public error = (error: any, details: Record<string, any>, subject: string = DEFAULT_SUBJECT) => {
    if (!error) {
      error = new Error('Colossus.error was called with null or undefined error')
      error.code = 'ERR_NIL_ERR'
      console.error(error)
    }

    const {code: errorCode, message, stack, config, request, response, ...rest} = error
    const code = errorCode || response && `http-${response.status}`
    const pickedDetails = {
      ... config ? {config: pick(PICKED_AXIOS_PROPS, config)} : undefined,
      ... request ? {request: pick(PICKED_AXIOS_PROPS, request)} : undefined,
      ... response ? {response: pick(PICKED_AXIOS_PROPS, response)} : undefined,
      ...JSON.parse(stringify(rest, errorReplacer)),
      ...details,
    }

    return this.sendLog(subject, {code, message, stack, details: pickedDetails}, 'error')
  }

  public sendLog = (subject: string, message: any, level: string) => {
    return this.http.put(routes.Log(level), message, {params: {subject}})
  }

  public sendEvent = (subject: string, route: string, message?: any) => {
    return this.http.put(routes.Event(route), message, {params: {subject}})
  }

  public sendMetric = (metric: BillingMetric) => {
    return this.http.post(routes.Metric(), metric)
  }
}

export interface ErrorLog {
  // Consistent accross many errors of the same type
  code: string
  // User-facing message, may vary by error
  message: string
  // Axios-compatible error format
  response?: {
    status: number
    data: string
    headers: Record<string, string>
  }
  // You might add any other keys with extra information
  [key: string]: any
}

export interface BillingMetric {
  value: number,
  unit: string,
  metricId: string,
  timestamp?: number,
}
