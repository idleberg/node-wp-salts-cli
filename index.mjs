#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import updateNotifier from 'update-notifier';
import './bin/cli.js';

async () => {
	const pkg = await fs.readFile('./package.json', 'utf8');

	updateNotifier({
		pkg,
	}).notify();
};
