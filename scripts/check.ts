import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, '..', 'templates');

const execPromise = util.promisify(exec);

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
  const template = 'base';
  const templatePath = path.join(TEMPLATE_PATH, template);

  // Check package.json
  try {
    const packageJsonPath = path.join(templatePath, 'package.json');
    const mainPackageJsonPath = path.join(__dirname, '..', 'package.json');

    const packageJson: PackageJson = JSON.parse(
      await fs.readFile(packageJsonPath, 'utf-8')
    );
    const mainPackageJson: PackageJson = JSON.parse(
      await fs.readFile(mainPackageJsonPath, 'utf-8')
    );

    // Fetch the latest version of astro-electron-ts from npm
    const { stdout } = await execPromise('npm view astro-electron-ts version');
    const npmVersion = stdout.trim();

    // Check if the version matches the main package version
    if (mainPackageJson.version === npmVersion) {
      errors.push(
        `Main package version matches the npm version of astro-electron-ts (${npmVersion}). They should not match.`
      );
    }

    // Required fields
    if (!packageJson.scripts?.dev) {
      errors.push(`${template} template missing dev script in package.json`);
    }
    if (!packageJson.scripts?.build) {
      errors.push(`${template} template missing build script in package.json`);
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
    const requiredDeps = ['astro'];
    for (const dep of requiredDeps) {
      if (!packageJson.dependencies?.[dep]) {
        errors.push(`${template} template missing ${dep} in dependencies`);
      }
    }

    // Required dev dependencies
    const requiredDevDeps = [
      'electron-builder',
      'electron',
      'astro-electron-ts',
      '@astrojs/check',
      'typescript',
    ];
    for (const dep of requiredDevDeps) {
      if (!packageJson.devDependencies?.[dep]) {
        errors.push(`${template} template missing ${dep} in devDependencies`);
      }
    }

    // Set template's astro-electron-ts dependency version to match main package version
    if (
      packageJson.dependencies?.['astro-electron-ts'] !==
      mainPackageJson.version
    ) {
      if (!packageJson.dependencies) {
        packageJson.dependencies = {};
      }
      if (!mainPackageJson.version) {
        errors.push('Main package.json is missing version field');
        return errors;
      }
      if (
        packageJson.dependencies['astro-electron-ts'] !==
        mainPackageJson.version
      ) {
        console.log(
          'Version mismatch. Updating template version to match main package version'
        );
        packageJson.dependencies['astro-electron-ts'] =
          mainPackageJson.version as string;
        // Write the updated package.json back to file
        await fs.writeFile(
          packageJsonPath,
          JSON.stringify(packageJson, null, 2)
        );
        console.log('Updated template version to', mainPackageJson.version);
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
  } catch (error) {
    errors.push(`Error checking ${template} astro.config.mjs: ${error}`);
  }

  // Check electron files
  const electronFiles = ['main.ts', 'preload.ts'];

  for (const file of electronFiles) {
    try {
      await fs.access(path.join(templatePath, 'electron', file));
    } catch {
      errors.push(`${template} template missing electron/${file}`);
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

  try {
    await fs.access(path.join(__dirname, '..', 'dist'));
  } catch {
    errors.push(`Main package missing dist directory`);
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
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Error running checks:', error);
  process.exit(1);
});
