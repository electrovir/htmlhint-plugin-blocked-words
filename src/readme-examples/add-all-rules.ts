import {readFileSync} from 'fs';
import {HTMLHint} from 'htmlhint';
import {addAllRules} from '..';

// this must be added before your HTMLHint api calls. It only needs to be called once per process.
addAllRules();

const yourCode = readFileSync('filename.ts').toString();
HTMLHint.verify(yourCode);
