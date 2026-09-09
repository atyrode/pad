import { expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';

const loaderUrl = new URL('./dictionaryUtils.ts', import.meta.url).href;
const engineUrl = new URL('../game/runtime.ts', import.meta.url).href;
const wasmPath = fileURLToPath(new URL('../generated/engine/interstice_engine_bg.wasm', import.meta.url));
const lexiconPath = fileURLToPath(new URL('../../public/dictionnary/french.txt', import.meta.url));

// Each process gets a fresh module cache and fetch mock, without changing the
// test runner's globals or adding a production-only cache-reset API.
async function runIsolated(scenario: string) {
  const child = Bun.spawn([
    process.execPath,
    '--eval',
    `import assert from 'node:assert/strict';
     import { loadDictionary } from ${JSON.stringify(loaderUrl)};
     import { initializeEngine } from ${JSON.stringify(engineUrl)};
     await initializeEngine(await Bun.file(${JSON.stringify(wasmPath)}).arrayBuffer());
     ${scenario}`,
  ], { stdout: 'pipe', stderr: 'pipe' });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  expect(exitCode, stderr || stdout).toBe(0);
}

for (const failure of ['network', 'http'] as const) {
  test(`dictionary retries after ${failure} failure instead of caching an empty lexicon`, async () => {
    await runIsolated(`
      let attempts = 0;
      globalThis.fetch = async () => {
        attempts += 1;
        if (attempts === 1) {
          ${failure === 'network'
            ? "throw new Error('Network unavailable');"
            : "return new Response('Service unavailable', { status: 503 });"}
        }
        return new Response(' chat \\r\\nmaison\\n\\n');
      };

      await assert.rejects(loadDictionary(), ${failure === 'network' ? '/Network unavailable/' : '/503/'});
      const ready = await loadDictionary();
      assert.equal(ready.has('CHAT'), true);
      assert.equal(ready.has('MAISON'), true);
      assert.equal(ready.has(''), false);
      assert.equal(ready.has('NOTAFRENCHWORD'), false);
      assert.equal(await loadDictionary(), ready);
      assert.equal(attempts, 2, 'successful data must remain usable without another fetch');
    `);
  });
}

test('concurrent dictionary loads share pending work and expose the existing French lexicon', async () => {
  await runIsolated(`
    let requests = 0;
    const pending = Promise.withResolvers();
    globalThis.fetch = () => {
      requests += 1;
      return pending.promise;
    };

    const first = loadDictionary();
    const second = loadDictionary();
    assert.equal(first, second, 'concurrent callers must share the pending load');
    assert.equal(requests, 1);
    pending.resolve(new Response(await Bun.file(${JSON.stringify(lexiconPath)}).text()));

    const [dictionary, concurrentDictionary] = await Promise.all([first, second]);
    assert.equal(dictionary, concurrentDictionary);
    for (const word of ['CHAT', 'CHATS', 'MAISON']) {
      assert.equal(dictionary.has(word), true, word + ' must remain accepted');
    }
    assert.equal(dictionary.has('NOTAFRENCHWORD'), false);
    assert.equal(await loadDictionary(), dictionary);
    assert.equal(requests, 1);
  `);
});
