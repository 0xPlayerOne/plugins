import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import {
  bytesDigest,
  digest,
  normalizeCategory,
  snapshotFromDirectory,
  stablePluginId,
  stableReleaseId,
  synchronize,
  verifyArtifacts,
  writeArtifacts,
  type CatalogPolicy,
  type CategoryMap,
  type ProductAliases,
} from './index.js';
import {
  parseJsonDocument,
  parseMarketplaceManifest,
  parseSourceSpec,
  type SourceConfig,
} from '../../source-adapters/src/index.js';
import { createMaterializationPlan, supportedHarnesses } from '../../harness-adapters/src/index.js';

const sources: SourceConfig[] = [
  {
    sourceId: 'openai-official',
    displayName: 'OpenAI fixture',
    repositoryUrl: 'https://github.com/openai/plugins',
    marketplaceDialect: 'openai',
    manifestPath: '.agents/plugins/marketplace.json',
    defaultBranch: 'main',
    trustClassification: 'official',
    fixturePath: 'openai',
    fixtureCommitSha: '1111111111111111111111111111111111111111',
  },
  {
    sourceId: 'cursor-official',
    displayName: 'Cursor fixture',
    repositoryUrl: 'https://github.com/cursor/plugins',
    marketplaceDialect: 'cursor',
    manifestPath: '.cursor-plugin/marketplace.json',
    defaultBranch: 'main',
    trustClassification: 'official',
    fixturePath: 'cursor',
    fixtureCommitSha: '2222222222222222222222222222222222222222',
  },
  {
    sourceId: 'claude-official',
    displayName: 'Claude fixture',
    repositoryUrl: 'https://github.com/anthropics/claude-plugins-official',
    marketplaceDialect: 'claude',
    manifestPath: '.claude-plugin/marketplace.json',
    defaultBranch: 'main',
    trustClassification: 'official',
    fixturePath: 'claude',
    fixtureCommitSha: '3333333333333333333333333333333333333333',
  },
  {
    sourceId: 'knowledge-work-official',
    displayName: 'Knowledge fixture',
    repositoryUrl: 'https://github.com/anthropics/knowledge-work-plugins',
    marketplaceDialect: 'claude',
    manifestPath: '.claude-plugin/marketplace.json',
    defaultBranch: 'main',
    trustClassification: 'official',
    fixturePath: 'knowledge',
    fixtureCommitSha: '4444444444444444444444444444444444444444',
  },
];

const categoryMap: CategoryMap = {
  aliases: {
    productivity: 'productivity',
    'developer tools': 'developer-tools',
    security: 'security',
    sales: 'sales',
    data: 'data',
  },
  fallback: 'other',
};
const productAliases: ProductAliases = { aliases: { linear: 'linear', calendar: 'calendar' } };
const policy: CatalogPolicy = {
  allowedRepositoryProtocols: ['https:'],
  allowedRepositoryHosts: ['github.com', 'www.github.com'],
  maxFilesPerPlugin: 100,
  maxBytesPerPlugin: 100_000,
  maxFileBytes: 20_000,
  maxMarketplacePlugins: 100,
  denyExecutableLifecycleScripts: true,
  publishRequiresCompleteContent: false,
  sensitiveCapabilityTypes: [
    'mcp-server',
    'connector',
    'hook',
    'browser',
    'scheduled-task',
    'executable',
  ],
};

describe('source adapters', () => {
  test('accepts all supported marketplace dialects and local source forms', async () => {
    for (const source of sources) {
      const text = await Bun.file(
        join(process.cwd(), 'fixtures', source.fixturePath!, source.manifestPath),
      ).text();
      const marketplace = parseMarketplaceManifest(parseJsonDocument(text), source);
      expect(marketplace.entries).toHaveLength(2);
      expect(marketplace.entries[0]?.source.kind).toBe('local');
    }
    expect(parseSourceSpec('./plugins/demo', sources[0]!).kind).toBe('local');
    const gitSource = parseSourceSpec(
      {
        source: 'git-subdir',
        url: 'https://github.com/acme/plugins.git',
        path: 'plugins/demo',
        ref: 'main',
        sha: 'a'.repeat(40),
      },
      sources[0]!,
    );
    expect(gitSource.kind === 'git' ? gitSource.subdirectory : undefined).toBe('plugins/demo');
  });

  test('rejects duplicate keys, traversal, and unsupported URL schemes', () => {
    expect(() => parseJsonDocument('{"plugins":[],"plugins":[]}')).toThrow('JSON_DUPLICATE_KEY');
    expect(() => parseSourceSpec({ source: 'local', path: '../outside' }, sources[0]!)).toThrow(
      'PATH_TRAVERSAL',
    );
    expect(() => parseSourceSpec('ftp://example.com/plugin', sources[0]!)).toThrow(
      'PLUGIN_SOURCE_SCHEME_UNSUPPORTED',
    );
    expect(() =>
      parseSourceSpec({ source: 'url', url: 'http://github.com/acme/plugin' }, sources[0]!),
    ).toThrow('GIT_URL_PROTOCOL_UNSUPPORTED');
    expect(() => parseSourceSpec('https://github.com:444/acme/plugin', sources[0]!)).toThrow(
      'GIT_URL_CREDENTIALS_OR_QUERY_FORBIDDEN',
    );
    expect(() => parseMarketplaceManifest({}, sources[0]!)).toThrow('MARKETPLACE_PLUGINS_REQUIRED');
  });
});

describe('deterministic catalog synchronization', () => {
  test('produces byte-identical complete artifacts from the same fixture commits', async () => {
    const first = await synchronize({
      sources,
      categoryMap,
      productAliases,
      policy,
      mode: 'offline',
      fixtureRoot: join(process.cwd(), 'fixtures'),
    });
    const second = await synchronize({
      sources,
      categoryMap,
      productAliases,
      policy,
      mode: 'offline',
      fixtureRoot: join(process.cwd(), 'fixtures'),
    });
    expect(first.artifacts).toEqual(second.artifacts);
    expect(first.catalog?.plugins).toHaveLength(8);
    expect(first.changeReport.contentResolution).toBe('complete');
    verifyArtifacts(first.artifacts!);
  });

  test('exits unchanged and reconstructs from the source lock without querying refs', async () => {
    const first = await synchronize({
      sources,
      categoryMap,
      productAliases,
      policy,
      mode: 'offline',
      fixtureRoot: join(process.cwd(), 'fixtures'),
    });
    const unchanged = await synchronize({
      sources,
      categoryMap,
      productAliases,
      policy,
      mode: 'offline',
      fixtureRoot: join(process.cwd(), 'fixtures'),
      existingLock: first.lock!,
    });
    expect(unchanged.changed).toBe(false);
    const rebuilt = await synchronize({
      sources,
      categoryMap,
      productAliases,
      policy,
      mode: 'offline',
      fixtureRoot: join(process.cwd(), 'fixtures'),
      fromLock: first.lock!,
    });
    expect(rebuilt.artifacts).toEqual(first.artifacts);
  });

  test('persists and reuses immutable pins for external plugin refs', async () => {
    const fixtureRoot = await mkdtemp(join(tmpdir(), 'plugin-pin-'));
    await mkdir(join(fixtureRoot, 'pin-test'), { recursive: true });
    await writeFile(
      join(fixtureRoot, 'pin-test', 'marketplace.json'),
      JSON.stringify({
        plugins: [
          {
            name: 'remote',
            description: 'Remote fixture plugin.',
            source: {
              source: 'git',
              url: 'https://github.com/acme/remote-plugin',
              ref: 'main',
            },
          },
        ],
      }),
    );
    const source: SourceConfig = {
      ...sources[0]!,
      sourceId: 'pin-test',
      displayName: 'Pin fixture',
      manifestPath: 'marketplace.json',
      fixturePath: 'pin-test',
      fixtureCommitSha: '5'.repeat(40),
    };
    const snapshotLoader = {
      load: async (repositoryUrl: string, commitSha: string, pluginSubdirectory: string) => {
        expect(repositoryUrl).toBe('https://github.com/acme/remote-plugin');
        expect(commitSha).toBe('5'.repeat(40));
        expect(pluginSubdirectory).toBe('');
        return {
          files: new Map([['plugin.json', new TextEncoder().encode('{"name":"Remote"}')]]),
          symlinks: [],
        };
      },
    };
    const first = await synchronize({
      sources: [source],
      categoryMap,
      productAliases,
      policy,
      mode: 'offline',
      fixtureRoot,
      snapshotLoader,
    });
    expect(first.lock?.sources[0]?.pluginPins[0]).toEqual({
      pluginName: 'remote',
      repositoryUrl: 'https://github.com/acme/remote-plugin',
      pluginSubdirectory: '',
      resolvedCommitSha: '5'.repeat(40),
    });
    const rebuilt = await synchronize({
      sources: [source],
      categoryMap,
      productAliases,
      policy,
      mode: 'offline',
      fixtureRoot,
      fromLock: first.lock!,
      snapshotLoader,
    });
    expect(rebuilt.artifacts).toEqual(first.artifacts);
  });

  test('skips apollo-skills symlinks deterministically without dropping safe plugins', async () => {
    const fixtureRoot = await mkdtemp(join(tmpdir(), 'apollo-symlink-'));
    await mkdir(join(fixtureRoot, 'apollo'), { recursive: true });
    await writeFile(
      join(fixtureRoot, 'apollo', 'marketplace.json'),
      JSON.stringify({
        plugins: [
          {
            name: 'apollo-skills',
            description: 'Unsafe symlink regression fixture.',
            source: './apollo-skills',
          },
          {
            name: 'safe-plugin',
            description: 'Safe plugin fixture.',
            source: './safe-plugin',
          },
        ],
      }),
    );
    const source: SourceConfig = {
      ...sources[0]!,
      sourceId: 'apollo-regression',
      displayName: 'Apollo symlink regression',
      manifestPath: 'marketplace.json',
      fixturePath: 'apollo',
      fixtureCommitSha: 'a'.repeat(40),
    };
    const result = await synchronize({
      sources: [source],
      categoryMap,
      productAliases,
      policy,
      mode: 'offline',
      fixtureRoot,
      snapshotLoader: {
        load: async (_repositoryUrl, _commitSha, pluginSubdirectory) =>
          pluginSubdirectory === 'apollo-skills'
            ? {
                files: new Map(),
                symlinks: ['.github/skills/skill-creator', 'CLAUDE.md'],
              }
            : {
                files: new Map([['skill.md', new TextEncoder().encode('# Safe plugin')]]),
                symlinks: [],
              },
      },
    });

    expect(result.catalog?.plugins.map((plugin) => plugin.upstreamPluginName)).toEqual([
      'safe-plugin',
    ]);
    expect(result.changeReport.contentResolution).toBe('complete-with-skips');
    expect(result.changeReport.skippedPlugins).toEqual([
      {
        sourceId: 'apollo-regression',
        pluginId: 'plugin:apollo-regression:apollo-skills',
        pluginName: 'apollo-skills',
        reasonCode: 'SYMLINK_ESCAPE',
        securityReason:
          'The plugin snapshot contains symlinks; symlinks are never followed, so the catalog excludes the plugin.',
        incompleteContent: true,
        paths: ['.github/skills/skill-creator', 'CLAUDE.md'].sort(),
      },
    ]);
    verifyArtifacts(result.artifacts!);
  });

  test('keeps a failed build from producing a new artifact set', async () => {
    const first = await synchronize({
      sources,
      categoryMap,
      productAliases,
      policy,
      mode: 'offline',
      fixtureRoot: join(process.cwd(), 'fixtures'),
    });
    const outputDirectory = join(await mkdtemp(join(tmpdir(), 'plugin-lkg-')), 'generated');
    await writeArtifacts(outputDirectory, first.artifacts!);
    const previousCatalog = await readFile(join(outputDirectory, 'catalog.v1.json'), 'utf8');
    await expect(
      synchronize({
        sources,
        categoryMap,
        productAliases,
        policy,
        mode: 'offline',
        fixtureRoot: join(process.cwd(), 'fixtures'),
        snapshotLoader: {
          load: async () => {
            throw new Error('UPSTREAM_FETCH_FAILED');
          },
        },
      }),
    ).rejects.toThrow('UPSTREAM_FETCH_FAILED');
    expect(first.artifacts?.['catalog.v1.json']).toContain(first.catalog?.catalogId);
    expect(await readFile(join(outputDirectory, 'catalog.v1.json'), 'utf8')).toBe(previousCatalog);
  });
});

describe('identity, classification, and harness contracts', () => {
  test('keeps source-qualified variants distinct while grouping known products', async () => {
    expect(stablePluginId('openai-official', 'gmail')).not.toBe(
      stablePluginId('cursor-official', 'gmail'),
    );
    expect(
      stableReleaseId('https://github.com/acme/a', 'plugins/x', 'a'.repeat(40), digest('same')),
    ).toBe(
      stableReleaseId('https://github.com/acme/a', 'plugins/x', 'a'.repeat(40), digest('same')),
    );
    expect(
      bytesDigest(
        new Map([
          ['b.txt', new TextEncoder().encode('b')],
          ['a.txt', new TextEncoder().encode('a')],
        ]),
      ),
    ).toBe(
      bytesDigest(
        new Map([
          ['a.txt', new TextEncoder().encode('a')],
          ['b.txt', new TextEncoder().encode('b')],
        ]),
      ),
    );
    expect(normalizeCategory('Developer Tools', categoryMap)).toBe('developer-tools');
  });

  test('generates a deterministic non-installing plan for every harness', async () => {
    const result = await synchronize({
      sources,
      categoryMap,
      productAliases,
      policy,
      mode: 'offline',
      fixtureRoot: join(process.cwd(), 'fixtures'),
    });
    const catalog = result.catalog!;
    for (const harness of supportedHarnesses()) {
      const plan = createMaterializationPlan({
        catalog,
        pluginId: 'plugin:openai-official:linear',
        harness,
      });
      expect(plan.pluginId).toBe('plugin:openai-official:linear');
      expect(plan.configuration.executeInstallation).toBe(false);
      expect(JSON.stringify(plan)).toBe(
        JSON.stringify(
          createMaterializationPlan({
            catalog,
            pluginId: plan.pluginId,
            harness,
            releaseId: plan.releaseId,
          }),
        ),
      );
    }
  });
});

describe('filesystem safety', () => {
  test('rejects a symlinked plugin root before following it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'plugins-fixture-'));
    const outside = await mkdtemp(join(tmpdir(), 'plugins-outside-'));
    await writeFile(join(outside, 'secret.txt'), 'secret');
    await symlink(outside, join(root, 'plugin'));
    const snapshot = await snapshotFromDirectory(root, 'plugin');
    expect(snapshot.symlinks).toEqual(['plugin']);
  });

  test('enforces file and archive-like size limits', async () => {
    const root = await mkdtemp(join(tmpdir(), 'plugins-size-'));
    await mkdir(join(root, 'plugin'), { recursive: true });
    await writeFile(join(root, 'plugin', 'large.txt'), '1234567890');
    const snapshot = await snapshotFromDirectory(root, 'plugin');
    expect(snapshot.files.size).toBe(1);
    expect(() => {
      if ([...snapshot.files.values()][0]!.byteLength > 5) throw new Error('PLUGIN_FILE_TOO_LARGE');
    }).toThrow('PLUGIN_FILE_TOO_LARGE');
  });
});
