import { Client, type ClientOptions } from '@modelcontextprotocol/sdk/client';
import {
  StreamableHTTPClientTransport,
  type StreamableHTTPClientTransportOptions,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';

/**
 * Create an MCP client and transport for connecting to a remote MCP server
 *
 * @param clientConfig - Client configuration including name and version
 * @param transportConfig - Transport configuration with server URL
 * @returns Object containing the configured client and transport
 *
 * @example
 * ```ts
 * const { client, transport } = createClient(
 *   { _clientInfo: { name: 'My App', version: '1.0.0' } },
 *   { url: new URL('http://localhost:8888/mcp') }
 * );
 * await client.connect(transport);
 * ```
 */
export const createClient = (
  clientConfig: {
    _clientInfo: Implementation;
    options?: ClientOptions;
  },
  transportConfig: {
    url: URL;
    opts?: StreamableHTTPClientTransportOptions;
  }
) => {
  const client = new Client(clientConfig._clientInfo, clientConfig.options);

  const transport = new StreamableHTTPClientTransport(transportConfig.url, transportConfig.opts);

  return { client, transport };
};
