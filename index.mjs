#!/usr/bin/env node

import { promises as fs } from 'fs';
import updateNotifier from 'update-notifier';
import './bin/cli.mjs';

(async () => {
  const pkg = await fs.readFile('./package.json', 'utf8');

  updateNotifier({
    pkg
  }).notify();
});

