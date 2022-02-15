import {Overwrite, safeMatch} from 'augment-vir';
import {Reporter} from 'htmlhint';
import {Block} from 'htmlhint/htmlparser';
import {createHtmlHintRule} from '../create-rule';

type TrueBlock = Overwrite<
    Block,
    // the types are wrong and this accounts for that
    {raw: undefined | string; tagName: undefined | string}
>;

const defaultBlockWordsOptions: BlockWordsOptions = {
    all: [],
    attributes: [],
    tagNames: [],
    text: [],
};
const allowedOptionKeys = Object.keys(defaultBlockWordsOptions);

function checkOptions(input: any): input is BlockWordsOptions {
    return (
        input &&
        typeof input === 'object' &&
        Object.keys(input).every((key) => allowedOptionKeys.includes(key))
    );
}

export function blockedWordMessage(
    blockedMatch: string,
    blockRegExp: RegExp,
    tagName?: string,
    type?: string,
): string {
    const contextMessage = type ? `${type} ` : '';
    const tagMessage = tagName ? ` in ${tagName}` : '';
    return `Blocked ${contextMessage}word from ${blockRegExp} detected${tagMessage}: "${blockedMatch}"`;
}

function generateReports(
    checkText: string,
    blockedWords: string[],
    tagName: string | undefined,
    type: 'text' | 'attribute' | 'tag name' | undefined,
): string[] | undefined {
    const messages: string[] = [];
    blockedWords.forEach((blockedWord) => {
        const checker = new RegExp(blockedWord.toLowerCase(), 'g');
        const match = safeMatch(checkText.toLowerCase(), checker);

        match.forEach((matchedText) => {
            messages.push(blockedWordMessage(matchedText, checker, tagName, type));
        });
        return undefined;
    });

    return messages.length ? messages : undefined;
}

function runReports({
    checkText,
    blockedWords,
    type,
    event,
    reporter,
}: {
    checkText: string;
    blockedWords: string[];
    type: 'text' | 'attribute' | 'tag name' | undefined;
    event: TrueBlock;
    reporter: Reporter;
}) {
    const tagName = event.tagName?.toLowerCase();
    const reports = generateReports(checkText, blockedWords, tagName, type);
    reports?.forEach((report) =>
        reporter.error(report, event.line, event.col, BlockWordsRule, event.raw ?? ''),
    );
}

export type BlockWordsOptions = {
    all?: string[];
    attributes?: string[];
    tagNames?: string[];
    text?: string[];
};

export const BlockWordsRule = createHtmlHintRule<BlockWordsOptions>({
    id: 'block-words',
    defaultOptions: defaultBlockWordsOptions,
    description:
        'Block a user defined set of words from appears in attributes. Like the default "id-class-ad-disabled" rule but more powerful as you as the user get to set the list of blocked words.',
    init: (parser, reporter, options) => {
        if (!options) {
            return;
        }
        if (!checkOptions(options)) {
            reporter.error(
                `Expected an object with keys from "${allowedOptionKeys.join(
                    ', ',
                )}" and string array values for rule ${BlockWordsRule.id} but got ${JSON.stringify(
                    options,
                )}`,
                1,
                1,
                BlockWordsRule,
                '',
            );
            return;
        }

        parser.addListener('all', (event: TrueBlock) => {
            // ignore comments
            if (event.type === 'comment') {
                return;
            }
            if (options.tagNames && event.type === 'tagstart' && event.tagName) {
                const tagName = event.tagName.toLowerCase();
                runReports({
                    blockedWords: options.tagNames,
                    checkText: tagName,
                    event,
                    reporter,
                    type: 'tag name',
                });
            }
            if (options.text && event.type === 'text' && event.raw) {
                runReports({
                    blockedWords: options.text,
                    checkText: event.raw,
                    event,
                    reporter,
                    type: 'text',
                });
            }
            if (options.attributes && event.type === 'tagstart' && event.raw) {
                const attributes = Object.entries(parser.getMapAttrs(event.attrs)).join(', ');
                console.log({attributes});
                runReports({
                    blockedWords: options.attributes,
                    checkText: attributes,
                    event,
                    reporter,
                    type: 'attribute',
                });
            }

            if (event.raw && options.all) {
                runReports({
                    blockedWords: options.all,
                    checkText: event.raw,
                    event,
                    reporter,
                    type: undefined,
                });
            }
        });
    },
    tests: [
        {
            description: 'should block an easy word all word that is within a class',
            html: `<html><head></head><body>What do we have here?<div class="bad-name"></div></body></html`,
            ruleOptions: {all: ['bad-name']},
            failures: [blockedWordMessage('bad-name', new RegExp('bad-name', 'g'), 'div')],
        },
        {
            description: 'should block an all word in a tag name and class name',
            html: `<html><head></head><body>What do we have here?<thing-bad-name-thing class="bad-name"></thing-bad-name-thing></body></html`,
            ruleOptions: {all: ['bad-name']},
            failures: [
                blockedWordMessage('bad-name', new RegExp('bad-name', 'g'), 'thing-bad-name-thing'),
                blockedWordMessage('bad-name', new RegExp('bad-name', 'g'), 'thing-bad-name-thing'),
                blockedWordMessage('bad-name', new RegExp('bad-name', 'g'), 'thing-bad-name-thing'),
            ],
        },
        {
            description: 'should block a word in tag names only',
            html: `<html><head></head><body>What do we have here?<thing-bad-name-thing class="bad-name"></thing-bad-name-thing></body></html`,
            ruleOptions: {tagNames: ['bad-name']},
            failures: [
                blockedWordMessage(
                    'bad-name',
                    new RegExp('bad-name', 'g'),
                    'thing-bad-name-thing',
                    'tag name',
                ),
            ],
        },
    ],
});

export default BlockWordsRule;
