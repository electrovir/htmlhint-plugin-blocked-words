import {HTMLHint} from 'htmlhint';
import {Ruleset} from 'htmlhint/types';
import {addAllRules, allRules} from './all-rules';
import {assertDefined} from './jest/test-helpers';

addAllRules();
allRules.forEach((customRule) => {
    describe(customRule.id, () => {
        it('should have some tests', () => {
            expect(customRule.tests.length).toBeGreaterThan(0);
        });

        customRule.tests.forEach((test) => {
            it(test.description, () => {
                const options: Ruleset = {[customRule.id]: test.ruleOptions, ...test.otherOptions};

                const messages = HTMLHint.verify(test.html, options);

                messages.forEach((message, index) => {
                    const expectedMessage = test.failures?.[index];
                    assertDefined(expectedMessage);
                    expect(message.message).toBe(expectedMessage);
                });
            });
        });
    });
});
