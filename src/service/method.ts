import { mapObjIndexed } from 'ramda'

import { IOClients } from '../clients/IOClients'
import { RouteHandler, ServiceContext } from './typings'
import { compose } from './utils/compose'

type HTTPMethods =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'CONNECT'
  | 'OPTIONS'
  | 'TRACE'
  | 'PATCH'
  | 'DEFAULT'

type MethodOptions<ClientsT extends IOClients = IOClients, StateT = void, CustomT = void> = Partial<
  Record<
    HTTPMethods,
    RouteHandler<ClientsT, StateT, CustomT> | Array<RouteHandler<ClientsT, StateT, CustomT>>
  >
>

export function method<ClientsT extends IOClients = IOClients, StateT = void, CustomT = void>(
  options: MethodOptions<ClientsT, StateT, CustomT>
) {
  const handlers = mapObjIndexed(
    handler => compose(Array.isArray(handler) ? handler : [handler]),
    options as Record<
      string,
      RouteHandler<ClientsT, StateT, CustomT> | Array<RouteHandler<ClientsT, StateT, CustomT>>
    >
  )

  return async (ctx: ServiceContext<ClientsT, StateT, CustomT>, next: () => Promise<any>) => {
    const verb = ctx.method.toUpperCase()
    const handler = handlers[verb] || handlers.DEFAULT

    if (handler) {
      await handler(ctx)
    }

    await next()
  }
}
