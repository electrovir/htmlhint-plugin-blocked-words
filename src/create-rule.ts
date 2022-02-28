import {Rule} from 'htmlhint/types';

export type RuleTest<T> = {
    description: string;
    html: string;
    ruleOptions: T;
    otherOptions?: Record<string, any>;
    failures?: string[];
    force?: true;
};

export type CustomRule<T> = Rule & {
    tests: RuleTest<T>[];
    defaultOptions: T;
};

export function createHtmlHintRule<T>(inputRule: CustomRule<T>): CustomRule<T> {
    return inputRule;
}
