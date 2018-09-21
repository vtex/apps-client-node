import {HttpClient, InstanceOptions, IOContext, withoutRecorder} from './HttpClient'

const routes = {
  Event: (route: string) => `/events/${route}`,
  Log: (level: string) => `/logs/${level}`,
  Metric: () => `/metrics`,
}

export class Colossus {
  private http: HttpClient

  constructor (ioContext: IOContext, opts: InstanceOptions = {}) {
    this.http = HttpClient.forWorkspace('colossus', withoutRecorder(ioContext), opts)
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

export interface BillingMetric {
  value: number,
  unit: string,
  metricId: string,
  timestamp?: number,
}
