import assert from 'node:assert/strict';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requireSupabaseBaseUrl, requireSupabasePublishableKey } from '../../src/_shared/config.js';
import { initializeServer } from '../../src/_shared/init_server_http.js';
import { regCrudTool } from '../../src/tools/db_crud.js';
import { connectInMemory } from './mcp-client.js';

const expectedError = process.env.MCP_TEST_BACKEND_ERROR;
const id = '12345678-1234-4234-8234-123456789abc';
const version = '01.00.000';
const requests: Request[] = [];

globalThis.fetch = async (input, init) => {
  const request = new Request(input, init);
  requests.push(request);
  const row = { id, version, json_ordered: { offline: true } };
  return new Response(
    JSON.stringify(
      request.url.includes('/rest/v1/')
        ? [row]
        : {
            ok: true,
            data: row,
            modelId: id,
            version,
            lifecycleModel: { id, version, json: row.json_ordered },
          },
    ),
    { headers: { 'content-type': 'application/json' } },
  );
};
console.error = () => {};

// The actual CRUD and model process-lookup client factories both use these guards.
if (expectedError) {
  assert.throws(
    () =>
      expectedError === 'SUPABASE_PUBLISHABLE_KEY'
        ? requireSupabasePublishableKey()
        : requireSupabaseBaseUrl(),
    new RegExp(expectedError, 'u'),
  );
}
const server = new McpServer({ name: 'backend-probe', version: '1.0.0' });
regCrudTool(server, 'test-bearer', {
  prepareWritePayload: async () => ({
    payload: { json_ordered: { offline: true }, json_tg: { nodes: [], edges: [] } },
    resolvedId: id,
    resolvedVersion: version,
  }),
});
const crud = await connectInMemory(server);
const remote = await connectInMemory(initializeServer('test-bearer'));
try {
  if (expectedError !== 'SUPABASE_PUBLISHABLE_KEY') {
    for (const name of [
      'Search_Flows_Tool',
      'Search_Processes_Tool',
      'Search_Life_Cycle_Models_Tool',
    ]) {
      const response = await remote.client.callTool({ name, arguments: { query: 'steel' } });
      assert.equal(response.isError === true, Boolean(expectedError), name);
      if (expectedError) assert.match(JSON.stringify(response), new RegExp(expectedError, 'u'));
    }
  }
  for (const table of ['sources', 'lifecyclemodels']) {
    for (const operation of ['select', 'insert', 'update', 'delete']) {
      const response = await crud.client.callTool({
        name: 'Database_CRUD_Tool',
        arguments: { table, operation, id, version, jsonOrdered: { offline: true } },
      });
      assert.equal(response.isError === true, Boolean(expectedError), `${table} ${operation}`);
      if (expectedError) assert.match(JSON.stringify(response), new RegExp(expectedError, 'u'));
    }
  }
  if (expectedError) {
    assert.equal(requests.length, 0);
  } else {
    assert.equal(requests.length, 11);
    const base = requireSupabaseBaseUrl();
    assert.deepEqual(
      requests.map((request) => request.url.replace(base, '')),
      [
        '/functions/v1/flow_hybrid_search',
        '/functions/v1/process_hybrid_search',
        '/functions/v1/lifecyclemodel_hybrid_search',
        '/rest/v1/sources?select=*&id=eq.12345678-1234-4234-8234-123456789abc&version=eq.01.00.000',
        '/functions/v1/app_dataset_create',
        '/functions/v1/app_dataset_save_draft',
        '/functions/v1/app_dataset_delete',
        '/rest/v1/lifecyclemodels?select=id%2Cversion%2Cjson_ordered&id=eq.12345678-1234-4234-8234-123456789abc&version=eq.01.00.000',
        '/functions/v1/save_lifecycle_model_bundle',
        '/functions/v1/save_lifecycle_model_bundle',
        '/functions/v1/delete_lifecycle_model_bundle',
      ],
    );
    for (const request of requests) {
      assert.equal(request.headers.get('authorization'), 'Bearer test-bearer');
      assert.equal(request.url.startsWith(`${base}/`), true);
    }
  }
} finally {
  await Promise.all([crud.close(), remote.close()]);
}
