import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_PROJECTS_PATH = path.join(__dirname, '..', 'test-projects');

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

async function runCommand(command: string, cwd: string): Promise<string> {
  console.log(`Running command: ${command}`);
  try {
    const { stdout, stderr } = await execPromise(command, {
      cwd,
      env: {
        ...process.env,
        FORCE_COLOR: '0', // Disable colors in output
      },
    });
    if (stderr) {
      console.error(`Command stderr: ${stderr}`);
    }
    console.log(`Command completed successfully`);
    return stdout.trim();
  } catch (error) {
    console.error(`Command failed: ${error}`);
    throw error;
  }
}

async function createAndCheckProjects() {
  const errors: string[] = [];

  try {
    // Clean up existing test projects if they exist
    console.log('Cleaning up existing test projects...');
    await fs.rm(TEST_PROJECTS_PATH, { recursive: true, force: true });

    // Create test projects directory
    console.log('Creating test projects directory...');
    await fs.mkdir(TEST_PROJECTS_PATH, { recursive: true });

    // Define project paths
    const astroJsPath = path.join(TEST_PROJECTS_PATH, 'astro-js');
    const astroTsPath = path.join(TEST_PROJECTS_PATH, 'astro-ts');
    const cliJsPath = path.join(TEST_PROJECTS_PATH, 'cli-js');
    const cliTsPath = path.join(TEST_PROJECTS_PATH, 'cli-ts');

    // Create Astro projects
    console.log('Creating JavaScript Astro project...');
    await runCommand(
      `npm create astro@latest ${astroJsPath} -- --template minimal --no-git --skip-houston --yes`,
      __dirname
    );

    console.log('Creating TypeScript Astro project...');
    await runCommand(
      `npm create astro@latest ${astroTsPath} -- --template minimal --typescript strict --no-git --skip-houston --yes`,
      __dirname
    );

    // Add Electron to existing Astro projects
    console.log('Adding Electron to JavaScript project...');
    await runCommand(
      `node ${path.join(
        __dirname,
        '..',
        'bin',
        'index.ts'
      )} add ${astroJsPath} --non-interactive`,
      __dirname
    );

    console.log('Adding Electron to TypeScript project...');
    await runCommand(
      `node ${path.join(
        __dirname,
        '..',
        'bin',
        'index.ts'
      )} add ${astroTsPath} --non-interactive`,
      __dirname
    );

    // Create new projects using our CLI
    console.log('Creating JavaScript project from CLI...');
    await runCommand(
      `node ${path.join(
        __dirname,
        '..',
        'bin',
        'index.ts'
      )} create ${cliJsPath} --non-interactive`,
      __dirname
    );

    console.log('Creating TypeScript project from CLI...');
    await runCommand(
      `node ${path.join(
        __dirname,
        '..',
        'bin',
        'index.ts'
      )} create ${cliTsPath} --typescript --non-interactive`,
      __dirname
    );

    // Check all projects
    const projectsToCheck = [
      { path: astroJsPath, name: 'astro-js', isTypeScript: false },
      { path: astroTsPath, name: 'astro-ts', isTypeScript: true },
      { path: cliJsPath, name: 'cli-js', isTypeScript: false },
      { path: cliTsPath, name: 'cli-ts', isTypeScript: true },
    ];

    for (const {
      path: projectPath,
      name: projectName,
      isTypeScript,
    } of projectsToCheck) {
      console.log(`Checking ${projectName}...`);

      // Check package.json
      try {
        const packageJsonPath = path.join(projectPath, 'package.json');
        const packageJson: PackageJson = JSON.parse(
          await fs.readFile(packageJsonPath, 'utf-8')
        );

        // Required fields
        if (!packageJson.scripts?.dev) {
          errors.push(`${projectName} missing dev script in package.json`);
        }
        if (!packageJson.scripts?.build) {
          errors.push(`${projectName} missing build script in package.json`);
        }
        if (!packageJson.scripts?.preview) {
          errors.push(`${projectName} missing preview script in package.json`);
        }
        if (!packageJson.main) {
          errors.push(`${projectName} missing main field in package.json`);
        }
        if (packageJson.main !== 'dist-electron/main.js') {
          errors.push(
            `${projectName} has incorrect main field in package.json. Should be 'dist-electron/main.js'`
          );
        }

        // Required dependencies
        const requiredDeps = ['astro', 'electron', 'astro-electron-ts'];
        for (const dep of requiredDeps) {
          if (!packageJson.dependencies?.[dep]) {
            errors.push(`${projectName} missing ${dep} in dependencies`);
          }
        }

        // Required dev dependencies
        const requiredDevDeps = ['electron-builder'];
        for (const dep of requiredDevDeps) {
          if (!packageJson.devDependencies?.[dep]) {
            errors.push(`${projectName} missing ${dep} in devDependencies`);
          }
        }
      } catch (error) {
        errors.push(`Error checking ${projectName} package.json: ${error}`);
      }

      // Check astro.config.mjs
      try {
        const configPath = path.join(projectPath, 'astro.config.mjs');
        const configContent = await fs.readFile(configPath, 'utf-8');

        if (!configContent.includes('astro-electron-ts')) {
          errors.push(
            `${projectName} missing astro-electron-ts import in astro.config.mjs`
          );
        }
      } catch (error) {
        errors.push(`Error checking ${projectName} astro.config.mjs: ${error}`);
      }

      // Check electron files
      const electronFiles = isTypeScript
        ? ['main.ts', 'preload.ts']
        : ['main.js', 'preload.js'];

      for (const file of electronFiles) {
        try {
          await fs.access(path.join(projectPath, 'electron', file));
        } catch {
          errors.push(`${projectName} missing electron/${file}`);
        }
      }

      // Check for incorrect file extensions
      const incorrectFiles = isTypeScript
        ? ['main.js', 'preload.js']
        : ['main.ts', 'preload.ts'];

      for (const file of incorrectFiles) {
        try {
          await fs.access(path.join(projectPath, 'electron', file));
          errors.push(
            `${projectName} has incorrect file: electron/${file}. It should use ${
              isTypeScript ? '.ts' : '.js'
            } extension.`
          );
        } catch {
          // File doesn't exist, which is correct in this case
        }
      }

      // Check required directories
      const requiredDirs = ['src', 'public', 'electron'];
      for (const dir of requiredDirs) {
        try {
          await fs.access(path.join(projectPath, dir));
        } catch {
          errors.push(`${projectName} missing ${dir} directory`);
        }
      }
    }

    return errors;
  } catch (error) {
    console.error('Error creating and checking projects:', error);
    throw error;
  }
}

async function main() {
  console.log('🔍 Creating and checking test projects...');
  const errors = await createAndCheckProjects();

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
