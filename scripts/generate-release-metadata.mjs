import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const artifactDir = path.resolve(process.argv[2] || 'release');
const tag = process.env.GITHUB_REF_NAME;
const commit = process.env.GITHUB_SHA;
const repository = process.env.GITHUB_REPOSITORY;
const runId = process.env.GITHUB_RUN_ID;

if (!tag || !commit || !repository || !runId) {
  throw new Error('GitHub tag, commit, repository, and run metadata are required.');
}

const checksumText = await readFile(path.join(artifactDir, 'SHA256SUMS.txt'), 'utf8');
const subjects = checksumText
  .trim()
  .split('\n')
  .map((line) => {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) throw new Error(`Invalid checksum entry: ${line}`);
    return { name: match[2], digest: { sha256: match[1] } };
  });

const createdAt = new Date().toISOString();
const workflowRef = `refs/tags/${tag}`;
const workflowUrl = `https://github.com/${repository}/.github/workflows/build.yml@${workflowRef}`;
const provenance = {
  _type: 'https://in-toto.io/Statement/v1',
  subject: subjects,
  predicateType: 'https://slsa.dev/provenance/v1',
  predicate: {
    buildDefinition: {
      buildType: 'https://actions.github.io/buildtypes/workflow/v1',
      externalParameters: {
        workflow: {
          ref: workflowRef,
          repository: `https://github.com/${repository}`,
          path: '.github/workflows/build.yml',
        },
      },
      resolvedDependencies: [
        {
          uri: `git+https://github.com/${repository}@${workflowRef}`,
          digest: { gitCommit: commit },
        },
      ],
    },
    runDetails: {
      builder: { id: workflowUrl },
      metadata: {
        invocationId: `https://github.com/${repository}/actions/runs/${runId}`,
        startedOn: createdAt,
      },
    },
  },
};

const isPrivate = process.env.REPOSITORY_PRIVATE === 'true';
const manifest = {
  schemaVersion: 1,
  version: tag.replace(/^v/, ''),
  commit,
  createdAt,
  checksums: 'SHA256SUMS.txt',
  sbom: 'sbom.cdx.json',
  provenance: 'provenance.intoto.json',
  githubAttestation: !isPrivate,
  repositoryVisibility: isPrivate ? 'private' : 'public',
  signed: process.env.WINDOWS_SIGNED === 'true',
};

await Promise.all([
  writeFile(
    path.join(artifactDir, 'provenance.intoto.json'),
    `${JSON.stringify(provenance, null, 2)}\n`,
  ),
  writeFile(
    path.join(artifactDir, 'release-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  ),
]);

console.log(`Wrote release manifest and provenance for ${tag} at ${commit}.`);
