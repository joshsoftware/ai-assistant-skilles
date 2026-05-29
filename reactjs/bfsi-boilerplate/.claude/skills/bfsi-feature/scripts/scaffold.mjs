#!/usr/bin/env node
/**
 * BFSI feature scaffolder.
 *
 * Reads templates from references/templates/ and writes a complete feature module.
 *
 * Usage: node scaffold.mjs <FeatureName> [--no-i18n]
 */
import { argv, exit, cwd } from 'node:process';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '..', 'references', 'templates');

const log = (msg) => console.error(`[bfsi-feature] ${msg}`);
const die = (msg) => {
  log(`error: ${msg}`);
  exit(2);
};

function parseArgs(args) {
  const positional = args.filter((a) => !a.startsWith('--'));
  const flags = Object.fromEntries(
    args
      .filter((a) => a.startsWith('--'))
      .map((a) => {
        const [k, v = 'true'] = a.replace(/^--/, '').split('=');
        return [k, v];
      }),
  );
  return { positional, flags };
}

function toKebab(s) {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function render(templateName, vars) {
  const tplPath = join(TEMPLATES_DIR, templateName);
  if (!(await exists(tplPath))) {
    log(`warning: template missing: ${templateName} (skipping)`);
    return null;
  }
  let content = await readFile(tplPath, 'utf8');
  for (const [k, v] of Object.entries(vars)) {
    content = content.replaceAll(`{{${k}}}`, v);
  }
  return content;
}

async function writeIfTemplate(templateName, dest, vars) {
  const content = await render(templateName, vars);
  if (content === null) return false;
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, content, 'utf8');
  log(`wrote ${dest}`);
  return true;
}

async function main() {
  const { positional } = parseArgs(argv.slice(2));
  const Name = positional[0];

  if (!Name) die('feature name is required');
  if (!/^[A-Z][A-Za-z0-9]+$/.test(Name)) die('feature name must be PascalCase');

  const kebab = toKebab(Name);
  const root = cwd();
  const featureDir = join(root, 'src', 'features', Name);

  if (await exists(featureDir)) {
    die(`feature directory already exists: ${featureDir}`);
  }

  const vars = {
    Name,
    name: Name.charAt(0).toLowerCase() + Name.slice(1),
    kebab,
    NAME: Name.toUpperCase(),
  };

  await writeIfTemplate('services.ts.tpl', join(featureDir, 'services.ts'), vars);
  await writeIfTemplate(
    'hooks.use.ts.tpl',
    join(featureDir, 'hooks', `use${Name}.ts`),
    vars,
  );
  await writeIfTemplate('schema.ts.tpl', join(featureDir, 'schema.ts'), vars);
  await writeIfTemplate('types.ts.tpl', join(featureDir, 'types.ts'), vars);
  await writeIfTemplate('constants.ts.tpl', join(featureDir, 'constants.ts'), vars);
  await writeIfTemplate('routes.tsx.tpl', join(featureDir, 'routes.tsx'), vars);
  await writeIfTemplate('index.ts.tpl', join(featureDir, 'index.ts'), vars);
  await writeIfTemplate(
    'containers.list.tsx.tpl',
    join(featureDir, 'containers', `${Name}List.tsx`),
    vars,
  );
  await writeIfTemplate(
    'containers.form.tsx.tpl',
    join(featureDir, 'containers', `${Name}Form.tsx`),
    vars,
  );
  await writeIfTemplate(
    'components.table.tsx.tpl',
    join(featureDir, 'components', `${Name}Table.tsx`),
    vars,
  );
  await writeIfTemplate(
    'tests.schema.test.ts.tpl',
    join(featureDir, '__tests__', 'schema.test.ts'),
    vars,
  );

  log(`done: feature "${Name}" scaffolded under src/features/${Name}/`);
  log(`next: pnpm typecheck && pnpm lint --filter ${kebab}`);
}

main().catch((err) => {
  log(`unexpected error: ${err.message}`);
  exit(2);
});
