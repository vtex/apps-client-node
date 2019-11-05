import { IOContext } from '../service/typings'
import { IOGraphQLClient } from './IOGraphQLClient'
import { AuthType, InstanceOptions } from './typings'

/**
 * Used to perform calls on apps you declared a dependency for in your manifest.
 */
export class AppGraphQLClient extends IOGraphQLClient {
  constructor(app: string, context: IOContext, options?: InstanceOptions) {
    const {account, workspace, region} = context
    const [appName, appVersion] = app.split('@')
    const [vendor, name] = appName.split('.') // vtex.messages
    let baseURL: string
    if (appVersion) {
      const [major] = appVersion.split('.')
      baseURL = `http://app.io.vtex.com/${vendor}.${name}/v${major}/${account}/${workspace}/_v/graphql`
    } else {
      context.logger.warn(`${account} in ${workspace} is using old routing for ${app}`)
      const service = [name, vendor].join('.') // messages.vtex
      baseURL = `http://${service}.${region}.vtex.io/${account}/${workspace}/_v/graphql`
    }

    super(
      context,
      {
        ...options,
        authType: AuthType.bearer,
        baseURL,
        name,
      }
    )
  }
}
