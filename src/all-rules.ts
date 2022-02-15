import {HTMLHint} from 'htmlhint';
import {CustomRule} from './create-rule';
import {BlockWordsRule} from './rules/block-words';

export const allRules: CustomRule<unknown>[] = [BlockWordsRule];

export function addAllRules() {
    allRules.forEach((rule) => {
        HTMLHint.addRule(rule);
    });
}
