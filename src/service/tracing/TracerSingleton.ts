import { initTracer as initJaegerTracer, TracingConfig, TracingOptions } from 'jaeger-client'
import { Tracer } from 'opentracing'
import { APP, LINKED, NODE_ENV, NODE_VTEX_API_VERSION, PRODUCTION, REGION, WORKSPACE } from '../../constants'
import { Tags } from '../../tracing/Tags'
import { appIdToAppAtMajor } from '../../utils'

export class TracerSingleton {
  public static getTracer() {
    if (!TracerSingleton.singleton) {
      TracerSingleton.singleton = TracerSingleton.initServiceTracer()
    }

    return TracerSingleton.singleton
  }

  private static singleton: Tracer

  private static initServiceTracer() {
    return TracerSingleton.createJaegerTracer(appIdToAppAtMajor(APP.ID), {
      [Tags.VTEX_APP_LINKED]: LINKED,
      [Tags.VTEX_APP_NODE_VTEX_API_VERSION]: NODE_VTEX_API_VERSION,
      [Tags.VTEX_APP_PRODUCTION]: PRODUCTION,
      [Tags.VTEX_APP_REGION]: REGION,
      [Tags.VTEX_APP_VERSION]: APP.VERSION,
      [Tags.VTEX_APP_WORKSPACE]: WORKSPACE,
      [Tags.VTEX_APP_NODE_ENV]: NODE_ENV ?? 'undefined',
    })
  }

  private static createJaegerTracer(serviceName: string, defaultTags: Record<string, string | boolean>) {
    const config: TracingConfig = {
      reporter: {
        agentHost: process.env.VTEX_OWN_NODE_IP,
      },
      sampler: {
        host: process.env.VTEX_OWN_NODE_IP,
        param: 0.05,
        refreshIntervalMs: 60 * 1000,
        type: 'remote',
      },
      serviceName,
    }

    const options: TracingOptions = {
      tags: defaultTags,
    }

    return initJaegerTracer(config, options)
  }
}
