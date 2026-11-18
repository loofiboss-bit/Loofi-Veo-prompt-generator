import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const binary = process.env.GITLEAKS_BIN || 'gitleaks';
const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--self-test')) throw new Error('Unknown secret-scan option.');

function run(command, argv, options = {}) {
  const result = spawnSync(command, argv, { encoding: 'utf8', cwd: root, ...options });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`${command} terminated: ${result.signal}`);
  return result;
}

const version = run(binary, ['version']);
if (version.status !== 0 || !/^v?8\.24\.3\s*$/.test(version.stdout.trim())) {
  throw new Error('Install Gitleaks 8.24.3 using the checksum-pinned security workflow.');
}

const scanArgs = [
  'git',
  '--log-opts=HEAD',
  '--redact',
  '--no-banner',
  '--no-color',
  '--gitleaks-ignore-path',
  path.join(root, '.gitleaksignore'),
];

if (args.includes('--self-test')) {
  const directory = await mkdtemp(path.join(tmpdir(), 'creator-secret-scan-'));
  const git = (argv) => {
    const result = run(
      'git',
      [
        '-c',
        'user.name=Scanner Test',
        '-c',
        'user.email=scanner@example.invalid',
        '-c',
        'commit.gpgsign=false',
        ...argv,
      ],
      { cwd: directory },
    );
    if (result.status !== 0) throw new Error('Unable to prepare isolated scanner fixture.');
  };
  try {
    git(['init', '--quiet']);
    const credentialPath = path.join(directory, 'fixture.txt');
    const synthetic = ['ghp', randomBytes(18).toString('hex')].join('_');
    await writeFile(credentialPath, `token=${synthetic}\n`, { mode: 0o600 });
    git(['add', 'fixture.txt']);
    git(['commit', '--quiet', '--no-verify', '-m', 'test: synthetic scanner fixture']);
    git(['rm', '--quiet', 'fixture.txt']);
    git(['commit', '--quiet', '--no-verify', '-m', 'test: remove fixture from current tree']);
    const report = path.join(directory, 'findings.json');
    const result = run(
      binary,
      [...scanArgs, '--report-format=json', `--report-path=${report}`, directory],
      { cwd: directory },
    );
    const findings = JSON.parse(await readFile(report, 'utf8'));
    if (
      result.status !== 1 ||
      !findings.some((finding) => finding.RuleID === 'github-pat' && finding.File === 'fixture.txt')
    ) {
      throw new Error('Full-history scanner did not detect the removed synthetic token.');
    }
    console.log('PASS: exact fingerprint exceptions preserve detection in full history.');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
} else {
  const result = run(binary, [...scanArgs, root], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
}
