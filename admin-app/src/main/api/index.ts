/**
 * External API client — centralises all outbound HTTP requests made by the
 * main process so that auth headers, base URLs and retry logic live in one
 * place.
 *
 * The renderer process triggers API calls through the IPC bridge in
 * src/main/ipc/handlers.ts rather than making fetch() calls directly.
 */

import { net } from 'electron';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
}

export interface ApiClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
}

class ApiClient {
  private config: ApiClientConfig = {
    baseUrl: '',
    defaultHeaders: { 'Content-Type': 'application/json' },
    timeoutMs: 15_000,
  };

  /** Configure the client once during app startup. */
  configure(config: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...config };
    console.log(`[API] Client configured → base URL: ${this.config.baseUrl || '(none)'}`);
  }

  async request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.config.baseUrl}${endpoint}`;

    const { method = 'GET', headers = {}, body } = options;

    const request = net.request({
      method,
      url,
    });

    const mergedHeaders = { ...this.config.defaultHeaders, ...headers };
    Object.entries(mergedHeaders).forEach(([key, value]) => {
      request.setHeader(key, value);
    });

    return new Promise((resolve, reject) => {
      let rawData = '';

      request.on('response', (response) => {
        response.on('data', (chunk) => { rawData += chunk.toString(); });
        response.on('end', () => {
          try {
            resolve(JSON.parse(rawData) as T);
          } catch {
            resolve(rawData as unknown as T);
          }
        });
        response.on('error', reject);
      });

      request.on('error', reject);

      if (body) {
        request.write(JSON.stringify(body));
      }

      request.end();
    });
  }
}

export const apiClient = new ApiClient();
