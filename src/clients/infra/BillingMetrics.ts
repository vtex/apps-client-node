import { InstanceOptions } from '../../HttpClient'
import { IOContext } from '../../service/worker/runtime/typings'
import { InfraClient } from './InfraClient'

export class BillingMetrics extends InfraClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super('colossus0.x', context, options)
  }

  public sendMetric = (metric: BillingMetric) => this.http.post<BillingMetric>('/metrics', metric)
}

export interface BillingMetric {
  value: number
  unit: string
  metricId: string
  timestamp?: number
}
