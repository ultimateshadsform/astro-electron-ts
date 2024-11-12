import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, '..', 'templates');

interface PackageJson {
  name?: string;
  version?: string;
  type?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  main?: string;
}

async function checkTemplates() {
  const errors: string[] = [];

  // Check both JavaScript and TypeScript templates
  const templates = ['javascript', 'typescript'];

  for (const template of templates) {
    const templatePath = path.join(TEMPLATE_PATH, template);

    // Check package.json
    try {
      const packageJsonPath = path.join(templatePath, 'package.json');
      const packageJson: PackageJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf-8')
      );

      // Required fields
      if (!packageJson.scripts?.dev) {
        errors.push(`${template} template missing dev script in package.json`);
      }
      if (!packageJson.scripts?.build) {
        errors.push(
          `${template} template missing build script in package.json`
        );
      }
      if (!packageJson.scripts?.preview) {
        errors.push(
          `${template} template missing preview script in package.json`
        );
      }
      if (!packageJson.main) {
        errors.push(`${template} template missing main field in package.json`);
      }
      if (packageJson.main !== 'dist-electron/main.js') {
        errors.push(
          `${template} template has incorrect main field in package.json. Should be 'dist-electron/main.js'`
        );
      }

      // Required dependencies
      const requiredDeps = ['astro', 'electron', 'astro-electron-ts'];
      for (const dep of requiredDeps) {
        if (!packageJson.dependencies?.[dep]) {
          errors.push(`${template} template missing ${dep} in dependencies`);
        }
      }

      // Required dev dependencies
      const requiredDevDeps = ['electron-builder'];
      for (const dep of requiredDevDeps) {
        if (!packageJson.devDependencies?.[dep]) {
          errors.push(`${template} template missing ${dep} in devDependencies`);
        }
      }
    } catch (error) {
      errors.push(`Error checking ${template} package.json: ${error}`);
    }

    // Check astro.config.mjs
    try {
      const configPath = path.join(templatePath, 'astro.config.mjs');
      const configContent = await fs.readFile(configPath, 'utf-8');

      if (!configContent.includes('astro-electron-ts')) {
        errors.push(
          `${template} template missing astro-electron-ts import in astro.config.mjs`
        );
      }

      if (template === 'javascript') {
        // JavaScript should have explicit paths
        if (!configContent.includes('dist-electron/main.js')) {
          errors.push(
            'JavaScript template missing main.js path in astro.config.mjs'
          );
        }
        if (!configContent.includes('dist-electron/preload.js')) {
          errors.push(
            'JavaScript template missing preload.js path in astro.config.mjs'
          );
        }
      } else {
        // TypeScript should have simple config
        if (
          configContent.includes('entry:') ||
          configContent.includes('input:')
        ) {
          errors.push(
            'TypeScript template should have simple electron config without explicit paths'
          );
        }
      }
    } catch (error) {
      errors.push(`Error checking ${template} astro.config.mjs: ${error}`);
    }

    // Check electron files
    const electronFiles =
      template === 'javascript'
        ? ['main.js', 'preload.js']
        : ['main.ts', 'preload.ts'];

    for (const file of electronFiles) {
      try {
        await fs.access(path.join(templatePath, 'electron', file));
      } catch {
        errors.push(`${template} template missing electron/${file}`);
      }
    }

    // Check TypeScript specific files
    if (template === 'typescript') {
      try {
        const tsconfigPath = path.join(templatePath, 'tsconfig.json');
        const tsconfig = JSON.parse(await fs.readFile(tsconfigPath, 'utf-8'));

        if (!tsconfig.compilerOptions?.types?.includes('electron')) {
          errors.push(
            'TypeScript template missing electron in tsconfig.json types'
          );
        }
      } catch (error) {
        errors.push(`Error checking TypeScript tsconfig.json: ${error}`);
      }
    }

    // Check required directories
    const requiredDirs = ['src', 'public', 'electron'];
    for (const dir of requiredDirs) {
      try {
        await fs.access(path.join(templatePath, dir));
      } catch {
        errors.push(`${template} template missing ${dir} directory`);
      }
    }

    // Check required Astro files
    const requiredAstroFiles = [
      'src/pages/index.astro',
      'src/layouts/Layout.astro',
      'src/components/Card.astro',
    ];
    for (const file of requiredAstroFiles) {
      try {
        await fs.access(path.join(templatePath, file));
      } catch {
        errors.push(`${template} template missing ${file}`);
      }
    }
  }

  return errors;
}

async function main() {
  console.log('🔍 Checking project templates...');
  const errors = await checkTemplates();

  if (errors.length > 0) {
    console.error('\n❌ Found the following issues:');
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  } else {
    console.log('\n✅ All checks passed!');
  }
}

main().catch((error) => {
  console.error('Error running checks:', error);
  process.exit(1);
});
