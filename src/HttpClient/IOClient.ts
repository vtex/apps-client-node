import { IOContext } from '../service/typings'

import { HttpClient } from './HttpClient'
import { InstanceOptions } from './typings'

export type IOClientConstructor = new (
  context: IOContext,
  options?: InstanceOptions
) => IOClient

/**
 * A client that can be instantiated by the Service runtime layer.
 */
export class IOClient {
  protected http: HttpClient

  public constructor(
    protected context: IOContext,
    protected options?: InstanceOptions
  ) {
    this.http = new HttpClient({
      name: this.constructor.name,
      ...context,
      ...options,
    })
  }
}
