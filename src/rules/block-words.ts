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
    attributeNames: [],
    attributeValues: [],
    tagNames: [],
    text: [],
};
const allowedOptionKeys = Object.keys(defaultBlockWordsOptions);

function checkOptions(input: any): input is BlockWordsOptions {
    return (
        input &&
        typeof input === 'object' &&
        Object.keys(input).every((key) => {
            return (
                allowedOptionKeys.includes(key) &&
                Array.isArray(input[key]) &&
                input[key].every((entry: any) => typeof entry === 'string')
            );
        })
    );
}

const blockWordsRuleName = 'block-words';

function invalidOptionsMessage(invalidOptions: any): string {
    return `Expected an object with keys from "${allowedOptionKeys.join(
        ', ',
    )}" and string array values for rule ${blockWordsRuleName} but got ${JSON.stringify(
        invalidOptions,
    )}`;
}

export function blockedWordMessage(
    blockedMatch: string,
    blockRegExp: RegExp,
    tagName?: string,
    type?: 'text' | 'attribute' | 'tag name' | undefined,
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
    attributeNames?: string[];
    attributeValues?: string[];
    tagNames?: string[];
    text?: string[];
};

export const BlockWordsRule = createHtmlHintRule<BlockWordsOptions>({
    id: blockWordsRuleName,
    defaultOptions: defaultBlockWordsOptions,
    description:
        'Block a user defined set of words from appears in attributes. Like the default "id-class-ad-disabled" rule but more powerful as you as the user get to set the list of blocked words.',
    init: (parser, reporter, options) => {
        if (!options) {
            return;
        }
        if (!checkOptions(options)) {
            reporter.error(invalidOptionsMessage(options), 1, 1, BlockWordsRule, '');
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
            if (event.type === 'tagstart' && event.raw) {
                Object.entries(parser.getMapAttrs(event.attrs)).forEach(
                    ([
                        attributeName,
                        attributeValue,
                    ]) => {
                        if (options.attributeValues) {
                            runReports({
                                blockedWords: options.attributeValues,
                                checkText: attributeValue,
                                event,
                                reporter,
                                type: 'attribute',
                            });
                        }
                        if (options.attributeNames) {
                            runReports({
                                blockedWords: options.attributeNames,
                                checkText: attributeName,
                                event,
                                reporter,
                                type: 'attribute',
                            });
                        }
                    },
                );
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
            html: `<html><head></head><body>What do we have here?<div class="bad-name"></div></body></html>`,
            ruleOptions: {all: ['bad-name']},
            failures: [blockedWordMessage('bad-name', new RegExp('bad-name', 'g'), 'div')],
        },
        {
            description: 'should error on option properties that are not an array',
            html: ``,
            ruleOptions: {all: 'invalid-option'} as unknown as BlockWordsOptions,
            failures: [invalidOptionsMessage({all: 'invalid-option'})],
        },
        {
            description: 'should error on non-object options',
            html: ``,
            ruleOptions: 'invalid-option' as unknown as BlockWordsOptions,
            failures: [invalidOptionsMessage('invalid-option')],
        },
        {
            description: 'should error on property arrays that are not purely string arrays',
            html: ``,
            ruleOptions: {
                all: [
                    4,
                    'invalid-option',
                ],
            } as unknown as BlockWordsOptions,
            failures: [
                invalidOptionsMessage({
                    all: [
                        4,
                        'invalid-option',
                    ],
                }),
            ],
        },
        {
            description: 'should work with default rules',
            html: `<html><head></head><body>What do we have here?<div class="bad-name" class="oops"></div></body></html>`,
            ruleOptions: {all: ['bad-name']},
            otherOptions: {'attr-no-duplication': true},
            failures: [
                'Duplicate of attribute name [ class ] was found.',
                blockedWordMessage('bad-name', new RegExp('bad-name', 'g'), 'div'),
            ],
        },
        {
            description: 'should block an all word in a tag name and class name',
            html: `<html><head></head><body>What do we have here?<thing-bad-name-thing class="bad-name"></thing-bad-name-thing></body></html>`,
            ruleOptions: {all: ['bad-name']},
            failures: [
                blockedWordMessage('bad-name', new RegExp('bad-name', 'g'), 'thing-bad-name-thing'),
                blockedWordMessage('bad-name', new RegExp('bad-name', 'g'), 'thing-bad-name-thing'),
                blockedWordMessage('bad-name', new RegExp('bad-name', 'g'), 'thing-bad-name-thing'),
            ],
        },
        {
            description: 'should not interfere with override comments for default rules',
            html: `
                <!-- htmlhint id-class-ad-disabled:false -->
                <html>
                    <head></head>
                    <body>
                        What do we have here?
                        <thing-ad-name-thing class="bad-name"></thing-ad-name-thing>
                    </body>
                </html>`,
            ruleOptions: {all: ['bad-name']},
            otherOptions: {'id-class-ad-disabled': true},
            failures: [
                blockedWordMessage('bad-name', new RegExp('bad-name', 'g'), 'thing-ad-name-thing'),
            ],
        },
        {
            description: 'should block all matches of attribute value',
            html: `
                <!-- htmlhint id-class-ad-disabled:false -->
                <html>
                    <head></head>
                    <body>
                        What do we have here?
                        <thing-ad-name-thing class="share-panel"></thing-ad-name-thing>
                        <thing-ad-name-thing class="other class names before share-panel"></thing-ad-name-thing>
                        <thing-ad-name-thing class="share-panel other class names after"></thing-ad-name-thing>
                        <thing-ad-name-thing class="class names before share-panel and class names after"></thing-ad-name-thing>
                    </body>
                </html>`,
            ruleOptions: {attributeValues: ['(?:^|\\s)share-panel(?:$|\\s)']},
            otherOptions: {'id-class-ad-disabled': true},
            failures: [
                blockedWordMessage(
                    'share-panel',
                    new RegExp('(?:^|\\s)share-panel(?:$|\\s)', 'g'),
                    'thing-ad-name-thing',
                    'attribute',
                ),
                blockedWordMessage(
                    ' share-panel',
                    new RegExp('(?:^|\\s)share-panel(?:$|\\s)', 'g'),
                    'thing-ad-name-thing',
                    'attribute',
                ),
                blockedWordMessage(
                    'share-panel ',
                    new RegExp('(?:^|\\s)share-panel(?:$|\\s)', 'g'),
                    'thing-ad-name-thing',
                    'attribute',
                ),
                blockedWordMessage(
                    ' share-panel ',
                    new RegExp('(?:^|\\s)share-panel(?:$|\\s)', 'g'),
                    'thing-ad-name-thing',
                    'attribute',
                ),
            ],
        },
        {
            description: 'should works with word boundaries',
            html: `
                <!-- htmlhint id-class-ad-disabled:false -->
                <html>
                    <head></head>
                    <body>
                        What do we have here?
                        <thing-ad-name-thing class="share-panel"></thing-ad-name-thing>
                        <thing-ad-name-thing class="other class names before share-panel"></thing-ad-name-thing>
                        <thing-ad-name-thing class="share-panel other class names after"></thing-ad-name-thing>
                        <thing-ad-name-thing class="class names before share-panel and class names after"></thing-ad-name-thing>
                    </body>
                </html>`,
            ruleOptions: {attributeValues: ['\\bshare-panel\\b']},
            otherOptions: {'id-class-ad-disabled': true},
            failures: [
                blockedWordMessage(
                    'share-panel',
                    new RegExp('\\bshare-panel\\b', 'g'),
                    'thing-ad-name-thing',
                    'attribute',
                ),
                blockedWordMessage(
                    'share-panel',
                    new RegExp('\\bshare-panel\\b', 'g'),
                    'thing-ad-name-thing',
                    'attribute',
                ),
                blockedWordMessage(
                    'share-panel',
                    new RegExp('\\bshare-panel\\b', 'g'),
                    'thing-ad-name-thing',
                    'attribute',
                ),
                blockedWordMessage(
                    'share-panel',
                    new RegExp('\\bshare-panel\\b', 'g'),
                    'thing-ad-name-thing',
                    'attribute',
                ),
            ],
        },
        {
            description: 'should get disabled by htmlhint comment',
            html: `
                <!-- htmlhint ${blockWordsRuleName}:false -->
                <html>
                    <head></head>
                    <body>
                        What do we have here?
                        <thing-ad-name-thing class="bad-name"></thing-ad-name-thing>
                    </body>
                </html>`,
            ruleOptions: {all: ['bad-name']},
        },
        {
            description: 'should block only attributes when set to do so',
            html: `
                <html>
                    <head></head>
                    <body>
                        What do we have here?
                        <thing-bad-name-thing class="bad-name lots of other words bad-name more words bad-name"></thing-bad-name-thing>
                    </body>
                </html>`,
            ruleOptions: {attributeValues: ['bad-name']},
            failures: [
                blockedWordMessage(
                    'bad-name',
                    new RegExp('bad-name', 'g'),
                    'thing-bad-name-thing',
                    'attribute',
                ),
                blockedWordMessage(
                    'bad-name',
                    new RegExp('bad-name', 'g'),
                    'thing-bad-name-thing',
                    'attribute',
                ),
                blockedWordMessage(
                    'bad-name',
                    new RegExp('bad-name', 'g'),
                    'thing-bad-name-thing',
                    'attribute',
                ),
            ],
        },
        {
            description: 'should block attribute names',
            html: `
                <html>
                    <head></head>
                    <body>
                        What do we have here?
                        <thing-bad-name-thing bad-attribute-name="whatever"></thing-bad-name-thing>
                    </body>
                </html>`,
            ruleOptions: {attributeNames: ['bad-attribute-name']},
            failures: [
                blockedWordMessage(
                    'bad-attribute-name',
                    new RegExp('bad-attribute-name', 'g'),
                    'thing-bad-name-thing',
                    'attribute',
                ),
            ],
        },
        {
            description: 'should block a word in tag names only',
            html: `<html><head></head><body>What do we have here?<thing-bad-name-thing class="bad-name"></thing-bad-name-thing></body></html>`,
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
        {
            description: 'should not block anything when no options are given',
            html: `<html><head></head><body>What do we have here?<thing-bad-name-thing class="bad-name"></thing-bad-name-thing></body></html>`,
            ruleOptions: {},
        },
    ],
});

export default BlockWordsRule;
