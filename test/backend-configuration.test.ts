import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

function backendEnvironment(baseUrl?: string, key = 'sb_publishable_offline_test') {
  const env = { ...process.env };
  delete env.SUPABASE_BASE_URL;
  delete env.SUPABASE_PUBLISHABLE_KEY;
  delete env.MCP_TEST_BACKEND_ERROR;
  if (baseUrl !== undefined) env.SUPABASE_BASE_URL = baseUrl;
  env.SUPABASE_PUBLISHABLE_KEY = key;
  return env;
}

describe('explicit Supabase backend', () => {
  for (const [name, baseUrl, key, expectedError] of [
    ['unset target', undefined, 'test-key', 'SUPABASE_BASE_URL'],
    ['blank target', ' \t ', 'test-key', 'SUPABASE_BASE_URL'],
    [
      'invalid target',
      'https://user:sentinel-secret@example.invalid/?token=secret',
      'test-key',
      'SUPABASE_BASE_URL',
    ],
    ['unsupported scheme', 'file:///tmp/backend', 'test-key', 'SUPABASE_BASE_URL'],
    ['missing database key', 'https://backend.example.invalid', '', 'SUPABASE_PUBLISHABLE_KEY'],
    ['custom backend', 'https://backend.example.invalid', 'test-key', undefined],
    ['local backend with trailing slash', 'http://127.0.0.1:54321/', 'test-key', undefined],
  ] as const) {
    it(`${name}: guards all remote search, read and command paths`, () => {
      const env = backendEnvironment(baseUrl, key);
      if (expectedError) env.MCP_TEST_BACKEND_ERROR = expectedError;
      const result = spawnSync(
        process.execPath,
        ['--import', 'tsx', 'test/helpers/backend-probe.ts'],
        {
          cwd: repoRoot,
          env,
          encoding: 'utf8',
          timeout: 30_000,
        },
      );
      assert.equal(result.error, undefined);
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
      assert.doesNotMatch(result.stderr, /sentinel-secret|token=secret/u);
    });
  }

  for (const baseUrl of [undefined, 'https://stdio-backend.example.invalid']) {
    it(`real STDIO initializes and runs local guidance with ${baseUrl ? 'explicit' : 'no'} backend`, async () => {
      const env = Object.fromEntries(
        Object.entries(backendEnvironment(baseUrl)).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      );
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: ['--import', 'tsx', '--import', './test/helpers/backend-fetch.ts', 'src/index.ts'],
        cwd: repoRoot,
        env,
        stderr: 'pipe',
      });
      let stderr = '';
      transport.stderr?.on('data', (chunk) => {
        stderr += String(chunk);
      });
      const client = new Client({ name: 'backend-stdio-test', version: '1.0.0' });
      try {
        await client.connect(transport);
        const listed = await client.listTools();
        assert.ok(listed.tools.some((tool) => tool.name === 'OpenLCA_Impact_Assessment_Tool'));
        assert.ok(listed.tools.some((tool) => tool.name === 'Search_Flows_Tool'));
        const local = await client.callTool({
          name: 'LCA_Calculation_Guidance_Tool',
          arguments: {},
        });
        assert.notEqual(local.isError, true);
        assert.match(JSON.stringify(local), /workflow/u);
        assert.equal(stderr.includes('MOCK_BACKEND_FETCH'), false);
        const remote = await client.callTool({
          name: 'Search_Flows_Tool',
          arguments: { query: 'steel' },
        });
        assert.equal(remote.isError === true, !baseUrl);
        if (baseUrl) {
          assert.match(
            JSON.stringify(remote),
            /https:\/\/stdio-backend.example.invalid\/functions\/v1\/flow_hybrid_search/u,
          );
        } else {
          assert.match(JSON.stringify(remote), /SUPABASE_BASE_URL is required/u);
        }
      } finally {
        await client.close();
        await transport.close();
      }
      assert.equal(stderr.includes('MOCK_BACKEND_FETCH'), Boolean(baseUrl));
    });
  }
});
