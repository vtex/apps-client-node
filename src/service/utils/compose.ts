import koaCompose from 'koa-compose'

import { IOClients } from '../../clients/IOClients'
import { timer, timerForEvents } from '../../utils/time'
import { EventHandler, RouteHandler } from '../typings'

export const compose = <ClientsT extends IOClients, StateT, CustomT>(middlewares: Array<RouteHandler<ClientsT, StateT, CustomT>>) =>
  koaCompose(middlewares.map(timer))

export const composeForEvents = <ClientsT extends IOClients, StateT>(middlewares: Array<EventHandler<ClientsT, StateT>>) =>
  koaCompose(middlewares.map(timerForEvents))
