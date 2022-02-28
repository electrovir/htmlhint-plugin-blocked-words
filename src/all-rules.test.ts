import {HTMLHint} from 'htmlhint';
import {Ruleset} from 'htmlhint/types';
import {addAllRules, allRules} from './all-rules';

addAllRules();
allRules.forEach((customRule) => {
    describe(customRule.id, () => {
        it('should have some tests', () => {
            expect(customRule.tests.length).toBeGreaterThan(0);
        });

        customRule.tests.forEach((test) => {
            const testFunction = test.force ? fit : it;

            testFunction(test.description, () => {
                const options: Ruleset = {[customRule.id]: test.ruleOptions, ...test.otherOptions};

                const messages: string[] = HTMLHint.verify(test.html, options).map(
                    (result) => result.message,
                );

                expect(messages).toEqual(test.failures ?? []);
            });
        });
    });
});
