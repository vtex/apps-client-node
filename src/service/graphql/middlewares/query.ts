import { json } from 'co-body'
import { compose, partialRight, prop } from 'ramda'
import { parse, Url } from 'url'
import { GraphQLServiceContext } from '../typings'

const parseVariables = (query: any) => {
  if (query && typeof query.variables === 'string') {
    query.variables = JSON.parse(query.variables)
  }
  return query
}

const queryFromUrl = compose<string, Url, string, Record<string, any>>(
  parseVariables,
  prop<any, any>('query'),
  partialRight(parse, [true])
)

export const parseQuery = async (ctx: GraphQLServiceContext, next: () => Promise<void>) => {
  const { request, req } = ctx

  let query: Record<string, any>
  if (request.is('multipart/form-data')) {
    query = (request as any).body
  } else if (request.method.toUpperCase() === 'POST') {
    query = await json(req)
  } else {
    query = queryFromUrl(request.url)
  }

  ctx.graphql.query = query

  await next()
}
