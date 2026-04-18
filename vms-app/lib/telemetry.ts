import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

let sdk: any = null;
try {
  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: 'vms-app',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
} catch (e) {
  console.error('OTel initialization failed:', e);
}

export function initTelemetry() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && sdk) {
    try {
      sdk.start();
    } catch (e) {
      console.error('OTel start failed:', e);
    }
    
    process.on('SIGTERM', () => {
      sdk.shutdown()
        .then(() => console.log('Tracing terminated'))
        .catch((error: any) => console.log('Error terminating tracing', error))
        .finally(() => process.exit(0));
    });
  }
}
