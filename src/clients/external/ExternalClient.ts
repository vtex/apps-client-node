import { InstanceOptions } from '../../HttpClient/typings'
import { IOContext } from '../../service/worker/runtime/typings'
import { IOClient } from '../IOClient'

/**
 * Used to perform calls to external endpoints for which you have declared outbound access policies in your manifest.
 */
export class ExternalClient extends IOClient {
  constructor(baseURL: string, context: IOContext, options?: InstanceOptions) {
    const { authToken } = context
    const headers = options?.headers ?? {}

    super(context, {
      ...options,
      baseURL,
      headers: {
        ...headers,
        'Proxy-Authorization': authToken,
      },
    })
  }
}
