import { AppClient, inflightUrlWithQuery, InstanceOptions } from '../HttpClient'
import { IOContext } from '../service/typings'
import { IOMessage } from '../utils/message'

interface Locale {
  [token: string]: string
}

interface Locales {
  [lang: string]: Locale
}

interface LocalesByProvider {
  [provider: string]: Locales
}

export class Messages extends AppClient {
  public constructor(vtex: IOContext, options?: InstanceOptions) {
    super('vtex.messages', vtex, options)
  }

  public translate = (to: string, data: IOMessage[]): Promise<string[]> =>
    this.http.get('/_v/translations', {
      inflightKey: inflightUrlWithQuery,
      metric: 'messages-translate',
      params: {
        data: JSON.stringify(data),
        to,
      },
    })

  public saveTranslation = (data: LocalesByProvider): Promise<void> =>
    this.http.post('/_v/translations', data, {
      metric: 'messages-save-translation',
    })
}
