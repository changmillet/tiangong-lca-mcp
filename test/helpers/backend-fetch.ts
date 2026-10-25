// A process-level fetch replacement for the real STDIO transport probe.
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init);
  process.stderr.write('MOCK_BACKEND_FETCH\n');
  return new Response(JSON.stringify({ url: request.url }), {
    headers: { 'content-type': 'application/json' },
  });
};
