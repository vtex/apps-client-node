import { InfraClient, InstanceOptions } from '../HttpClient'
import { IOContext } from '../service/typings'

const routes = {
  AvailableIoVersions: '/_io',
  AvailableServiceVersions: (service: string) =>
    `${routes.AvailableServices}/${service}`,
  AvailableServices: '/_services',
  InstalledIoVersion: (account: string, workspace: string) =>
    `/${account}/${workspace}/io`,
  InstalledService: (account: string, workspace: string, name: string) =>
    `/${routes.InstalledServices(account, workspace)}/services/${name}`,
  InstalledServices: (account: string, workspace: string) =>
    `/${account}/${workspace}/services`,
}

export class Router extends InfraClient {
  public constructor(ioContext: IOContext, opts?: InstanceOptions) {
    super('router', ioContext, opts, true)
  }

  public listAvailableIoVersions = () => {
    return this.http.get<AvaiableIO[]>(routes.AvailableIoVersions)
  }

  public getInstalledIoVersion = () => {
    if (!this.context.account || !this.context.workspace) {
      throw new Error('Missing client parameters: {account, workspace}')
    }
    return this.http.get<InstalledIO>(
      routes.InstalledIoVersion(this.context.account, this.context.workspace)
    )
  }

  public installIo = (version: string) => {
    if (!this.context.account || !this.context.workspace) {
      throw new Error('Missing client parameters: {account, workspace}')
    }
    return this.http.put(
      routes.InstalledIoVersion(this.context.account, this.context.workspace),
      { version }
    )
  }

  public listAvailableServices = () => {
    return this.http.get<AvailableServices>(routes.AvailableServices)
  }

  public getAvailableVersions = (name: string) => {
    return this.http.get<AvailableServiceVersions>(
      routes.AvailableServiceVersions(name)
    )
  }

  public listInstalledServices = () => {
    if (!this.context.account || !this.context.workspace) {
      throw new Error('Missing client parameters: {account, workspace}')
    }
    return this.http.get<InstalledService[]>(
      routes.InstalledServices(this.context.account, this.context.workspace)
    )
  }

  public installService = (name: string, version: string) => {
    if (!this.context.account || !this.context.workspace) {
      throw new Error('Missing client parameters: {account, workspace}')
    }
    return this.http.post(
      routes.InstalledServices(this.context.account, this.context.workspace),
      { name, version }
    )
  }
}

export interface AvaiableIO {
  version: string
  tested: boolean
  services: {
    [service: string]: string
  }
}

export type InstalledIO = AvaiableIO

export interface AvailableServiceVersions {
  versions: {
    [region: string]: string[]
  }
}

export interface AvailableServices {
  [service: string]: AvailableServiceVersions
}

export interface InstalledService {
  name: string
  version: string
  serviceIsolation: number
}
