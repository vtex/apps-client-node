import {HttpClient} from './HttpClient'
import {CacheStorage} from './HttpClient/cache'

const routes = {
  START: '/start',
  SEND: '/accesskey/send',
  VALIDATE: '/accesskey/validate',
  VALIDATE_CLASSIC: '/classic/validate',
}

const VTEXID_ENDPOINTS: Record<string, string> = {
  STABLE: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication',
  BETA: 'https://vtexid.vtex.com.br/api/vtexid/pub/authentication',
}

const endpoint = (env: string) => {
  return VTEXID_ENDPOINTS[env] || env
}

export class ID {
  private http: HttpClient
  private headers: Record<string, string>

  constructor (endpointUrl: string = 'STABLE', opts: IDInstanceOptions) {
    const {accept, authToken, userAgent, timeout, cacheStorage} = opts

    this.headers = opts.accept ? {accept: opts.accept} : {}
    this.headers = {
      ...this.headers,
      Authorization: `token ${opts.authToken}`,
      'User-Agent': opts.userAgent,
    }

    this.http = HttpClient.forLegacy(endpoint(endpointUrl), {headers: this.headers, timeout, cacheStorage})
  }

  getTemporaryToken = () => {
    return this.http.get<TemporaryToken>(routes.START).then(({authenticationToken}) => authenticationToken)
  }

  sendCodeToEmail = (token: string, email: string) => {
    const params = {authenticationToken: token, email}
    return this.http.get(routes.SEND, { params })
  }

  getEmailCodeAuthenticationToken = (token: string, email: string, code: string) => {
    const params = {
      login: email,
      accesskey: code,
      authenticationToken: token,
    }
    return this.http.get<AuthenticationResponse>(routes.VALIDATE, { params })
  }

  getPasswordAuthenticationToken = (token: string, email: string, password: string) => {
    const params = {
      login: email,
      password,
      authenticationToken: token,
    }
    return this.http.get<AuthenticationResponse>(routes.VALIDATE_CLASSIC, { params })
  }
}

type TemporaryToken = {
  authenticationToken: string,
}

export type AuthenticationResponse = {
  promptMFA: boolean,
  clientToken: any,
  authCookie: {
    Name: string,
    Value: string,
  },
  accountAuthCookie: any,
  expiresIn: number,
  userId: string,
  phoneNumber: string,
  scope: any,
}

export type IDInstanceOptions = {
  authToken: string,
  userAgent: string,
  timeout?: number,
  accept?: string,
  cacheStorage?: CacheStorage,
}
