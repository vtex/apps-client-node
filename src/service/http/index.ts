import { ClientsImplementation, IOClients } from '../../clients/IOClients'
import { ClientsConfigOptions, RouteHandler, } from '../typings'
import { compose } from '../utils/compose'
import { clients } from './middlewares/clients'
import { error } from './middlewares/error'
import { timings } from './middlewares/timings'

export const createHttpRoute = <ClientsT extends IOClients, StateT, CustomT>(
  Clients: ClientsImplementation<ClientsT>,
  options: ClientsConfigOptions<ClientsT>
) => {
  return (handler: RouteHandler<ClientsT, StateT, CustomT> | Array<RouteHandler<ClientsT, StateT, CustomT>>) => {
    const middlewares = Array.isArray(handler) ? handler : [handler]
    const pipeline = [clients(Clients, options), timings, error, ...middlewares]
    return compose(pipeline)
  }
}
