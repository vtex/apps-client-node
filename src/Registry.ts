import * as archiver from 'archiver'
import {extract} from 'tar-fs'
import {createGunzip, ZlibOptions} from 'zlib'
import {Readable, Writable} from 'stream'
import {IncomingMessage} from 'http'

import {HttpClient, InstanceOptions, IOContext} from './HttpClient'
import {AppBundlePublished, AppManifest, AppFilesList} from './responses'

const EMPTY_OBJECT = {}

const routes = {
  Registry: '/registry',
  Publish: '/v2/registry',
  App: (app: string) => `${routes.Registry}/${app}`,
  AppVersion: (app: string, version: string) => `${routes.App(app)}/${version}`,
  AppFiles: (app: string, version: string) => `${routes.AppVersion(app, version)}/files`,
  AppFile: (app: string, version: string, path: string) => `${routes.AppFiles(app, version)}/${path}`,
  AppBundle: (app: string, version: string, path: string) => `${routes.AppVersion(app, version)}/bundle/${path}`,
}

export class Registry {
  private http: HttpClient

  constructor (ioContext: IOContext, opts: InstanceOptions = {}) {
    this.http = HttpClient.forWorkspace('apps', ioContext, opts)
  }

  publishApp = async (files: File[], tag?: string, {zlib}: zipOptions = {}) => {
    if (!(files[0] && files[0].path && files[0].content)) {
      throw new Error('Argument files must be an array of {path, content}, where content can be a String, a Buffer or a ReadableStream.')
    }
    const indexOfManifest = files.findIndex(({path}) => path === 'manifest.json')
    if (indexOfManifest === -1) {
      throw new Error('No manifest.json file found in files.')
    }
    const zip = archiver('zip', {zlib})
    // Throw stream errors so they reject the promise chain.
    zip.on('error', (e) => {
      throw e
    })
    const request = this.http.post<AppBundlePublished>(routes.Publish, zip, {
      params: tag ? {tag} : EMPTY_OBJECT,
      headers: {'Content-Type': 'application/zip'},
    })

    files.forEach(({content, path}) => zip.append(content, {name: path}))
    const finalize = zip.finalize()

    try {
      const [response] = await Promise.all([request, finalize])
      response.bundleSize = zip.pointer()
      return response
    } catch (e) {
      e.bundleSize = zip.pointer()
      throw e
    }
  }

  listApps = () => {
    return this.http.get<RegistryAppsList>(routes.Registry)
  }

  listVersionsByApp = (app: string) => {
    return this.http.get<RegistryAppVersionsList>(routes.App(app))
  }

  deprecateApp = (app: string, version: string) => {
    return this.http.patch(routes.AppVersion(app, version), {deprecated: true})
  }

  getAppManifest = (app: string, version: string, opts?: AppsManifestOptions) => {
    return this.http.get<AppManifest>(routes.AppVersion(app, version), {params: opts})
  }

  listAppFiles = (app: string, version: string, opts?: ListAppFilesOptions) => {
    return this.http.get<AppFilesList>(routes.AppFiles(app, version), {params: opts})
  }

  getAppFile = (app: string, version: string, path: string) => {
    return this.http.getBuffer(routes.AppFile(app, version, path))
  }

  getAppFileStream = (app: string, version: string, path: string): Promise<IncomingMessage> => {
    return this.http.getStream(routes.AppFile(app, version, path))
  }

  getAppBundle = (app: string, version: string, bundlePath: string, generatePackageJson: boolean): Promise<Readable> => {
    const params = generatePackageJson && {_packageJSONEngine: 'npm', _packageJSONFilter: 'vtex.render-builder@x'}
    return this.http.getStream(routes.AppBundle(app, version, bundlePath), {
      params,
      headers: {
        Accept: 'application/x-gzip',
        'Accept-Encoding': 'gzip',
      },
    })
  }

  unpackAppBundle = (app: string, version: string, bundlePath: string, unpackPath: string, generatePackageJson: boolean): Promise<Writable> => {
    return this.getAppBundle(app, version, bundlePath, generatePackageJson)
      .then(stream => stream
        .pipe(createGunzip())
        .pipe(extract(unpackPath)),
      )
  }
}

type zipOptions = {
  zlib?: ZlibOptions,
}

export type AppsManifestOptions = {
  resolveDeps: boolean,
}

export type ListAppFilesOptions = {
  prefix: string,
}

export type RegistryAppsListItem = {
  partialIdentifier: string,
  location: string,
}

export type RegistryAppsList = {
  data: RegistryAppsListItem[],
}

export type RegistryAppVersionsListItem = {
  versionIdentifier: string,
  location: string,
}

export type RegistryAppVersionsList = {
  data: RegistryAppVersionsListItem[],
}

export type File = {
  path: string,
  content: any,
}
