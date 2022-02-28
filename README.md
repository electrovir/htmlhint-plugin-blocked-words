# htmlhint-plugin-blocked-words

An [HTMLHint](https://htmlhint.com/) plugin that allows users to block arbitrary phrases in HTML code.

# Installation

You probably want this as a dev dependency:

```shell
npm i -D htmlhint-plugin-blocked-words
```

# Load into HTMLHint

## CLI

If calling HTMLHint via its CLI, you'll need to use the [`--rulesdir` or `-r` option](https://htmlhint.com/docs/user-guide/usage/cli#--rulesdir--r) for HTMLHint:

```shell
npx htmlhint index.html -r node_modules/htmlhint-plugin-blocked-words/dist/rules
```

## JS API

If calling HTMLHint via its JS API (shown below as `HTMLHint.verify`), you can use the `addAllRules` export from this package:

<!-- example-link: src/readme-examples/add-all-rules.ts -->

```TypeScript
import {readFileSync} from 'fs';
import {HTMLHint} from 'htmlhint';
import {addAllRules} from 'htmlhint-plugin-blocked-words';

// this must be added before your HTMLHint api calls. It only needs to be called once per process.
addAllRules();

const yourCode = readFileSync('filename.ts').toString();
HTMLHint.verify(yourCode);
```

# Temporarily ignoring

Add the following comment to the top of a file to turn off a rule for that file. (Note that HTMLHint does not document this anywhere but it works.)

<!-- example-link: src/readme-examples/ignore-for-file.html -->

```HTML
<!-- htmlhint block-words:false -->
<html>
    <head>
        <title>Document Title</title>
    </head>
    <body>
        Stuff
    </body>
</html>
```

# Rules

## block-words

This is the main (currently only) rule, used to block phrases in tag names, text, attribute names, or attribute values.

This rule accepts an object with the following type:

<!-- example-link: src/rules/block-words-options.ts -->

```TypeScript
export type BlockWordsOptions = {
    all?: string[];
    attributeNames?: string[];
    attributeValues?: string[];
    tagNames?: string[];
    text?: string[];
};
```

Each string in each array is treated as a regular expression, so RegExp syntax can be used. (Make sure to escape the backslash though, like this: `"\\s"`.)

-   `all`: checks each HTML node's entire raw text.
-   `attributeNames`: checks every attribute name (such as `class`, `id`, or custom attributes).
-   `attributeValues`: checks every attribute's values (such as `this is a list of class names` in `<div class="this is a list of class names"></div>`).
-   `tagNames`: checks every tag name (such as `div`).
-   `text`: checks the text of each node (such as `this is some text` in `<div>this is some text</div>`).

Turn off the rule by giving it a falsy value, such as `false`, `null`, or even an empty string `''`.

Example usage:

<!-- example-link: src/readme-examples/example-htmlhintrc.json -->

```JSON
{
    "block-words": {
        "attributeValues": ["\\bbad-phrase\\b"]
    }
}
```

With that given `htmlhintrc` file, the following is **invalid**:

```html
<div class="bad-phrase"></div>
```

While the following is **valid**:

```html
<div>bad-phrase</div>
```

(To block `bad-phrase` also in text, use the `all` or `text` property in the `block-words` options.)
