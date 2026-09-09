import { createHash } from 'node:crypto';
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generated = join(root, 'src/generated/engine');
const publicDirectory = join(root, 'public/engine');
const contract = join(root, 'src/game/generated.ts');
const target = resolve(root, process.env.CARGO_TARGET_DIR ?? 'target');
const executableSuffix = process.platform === 'win32' ? '.exe' : '';
const sources = ['Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', 'scripts/build-engine.ts'];
for await (const path of new Bun.Glob('crates/**/{*.rs,Cargo.toml}').scan({ cwd: root })) sources.push(path);
const hash = createHash('sha256');
for (const path of sources.sort()) hash.update(path).update('\0').update(await readFile(join(root, path)));
const fingerprint = hash.digest('hex').slice(0, 20);

async function exists(path: string) {
    try { await access(path); return true; } catch { return false; }
}

const manifestPath = join(generated, 'build.json');
if (await exists(manifestPath)) {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { fingerprint: string };
    const outputs = [contract, join(generated, 'skrabble_engine.js'), join(generated, 'skrabble_engine.d.ts'),
        join(generated, 'skrabble_engine_bg.wasm'), join(publicDirectory, `${fingerprint}.wasm`),
        join(target, `release/engine-cli${executableSuffix}`), join(target, `release/export-interface${executableSuffix}`)];
    if (manifest.fingerprint === fingerprint && (await Promise.all(outputs.map(exists))).every(Boolean)) {
        console.log(`Rust engine ${fingerprint} is current.`);
        process.exit(0);
    }
}

async function run(command: string[], capture = false): Promise<string> {
    if (!Bun.which(command[0])) throw new Error(`${command[0]} is required. Install the pinned Rust toolchain and wasm-bindgen-cli 0.2.121; see README.`);
    const child = Bun.spawn(command, { cwd: root, stdout: capture ? 'pipe' : 'inherit', stderr: 'inherit', stdin: 'ignore' });
    const [code, output] = await Promise.all([child.exited, capture ? new Response(child.stdout).text() : Promise.resolve('')]);
    if (code !== 0) throw new Error(`${command.join(' ')} failed (${code}).`);
    return output;
}

await run(['cargo', 'build', '--locked', '--release', '--bins']);
await run(['cargo', 'build', '--locked', '--release', '--target', 'wasm32-unknown-unknown', '--lib']);
const temporary = await mkdtemp(join(tmpdir(), 'skrabble-wasm-'));
try {
    await run(['wasm-bindgen', '--target', 'web', '--out-dir', temporary, '--out-name', 'skrabble_engine',
        join(target, 'wasm32-unknown-unknown/release/skrabble_engine.wasm')]);
    const executable = join(target, `release/export-interface${executableSuffix}`);
    const declarations = await run([executable], true);
    await Promise.all([mkdir(generated, { recursive: true }), mkdir(publicDirectory, { recursive: true })]);
    await cp(join(temporary, 'skrabble_engine_bg.wasm'), join(publicDirectory, `${fingerprint}.wasm`));
    const javascript = await readFile(join(temporary, 'skrabble_engine.js'), 'utf8');
    const defaultUrl = "new URL('skrabble_engine_bg.wasm', import.meta.url)";
    if (!javascript.includes(defaultUrl)) throw new Error('Unexpected wasm-bindgen loader; review the generated asset URL.');
    // Keep one public Wasm asset, rather than making Next bundle a second unused copy.
    const browserJavascript = javascript.replace(defaultUrl, JSON.stringify(`/skrabble/engine/${fingerprint}.wasm`));
    const types = await readFile(join(temporary, 'skrabble_engine.d.ts'), 'utf8');
    // A changed binary must also invalidate the frontend module and its initialized instance.
    await writeFile(join(temporary, 'skrabble_engine.js'), `${browserJavascript}\nexport const ENGINE_BUILD = ${JSON.stringify(fingerprint)};\n`);
    await writeFile(join(temporary, 'skrabble_engine.d.ts'), `${types}\nexport const ENGINE_BUILD: string;\n`);
    await cp(temporary, generated, { recursive: true });
    await writeFile(contract, declarations);
    await writeFile(manifestPath, JSON.stringify({ fingerprint }) + '\n');
    for await (const file of new Bun.Glob('*.wasm').scan({ cwd: publicDirectory })) {
        if (file !== `${fingerprint}.wasm`) await rm(join(publicDirectory, file));
    }
    console.log(`Built Rust engine ${fingerprint} for native and browser use.`);
} finally {
    await rm(temporary, { recursive: true, force: true });
}
