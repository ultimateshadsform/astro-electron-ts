#!/usr/bin/env node

import { main } from '../src/cli.js';

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
