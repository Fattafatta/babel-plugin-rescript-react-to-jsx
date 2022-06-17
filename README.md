# babel-plugin-rescript-react-to-jsx

Transforms code compiled by [ReScript](https://rescript-lang.org/) to JSX. This is done by turning function calls of `React.createElement` (and similar) back to JSX syntax.

The goal of this transformation is to support [solidJs](https://github.com/solidjs/solid) (or similar libraries), that use their own compiler to convert JSX to JavaScript.

## Info

There is an open issue for ReScript for enabling a JSX-preserve-mode: <https://github.com/rescript-lang/syntax/issues/539>. Until this is done, this babel plugin can function as a workaround.

## Installation

This plugin is meant to be used together with solidJs. No other frameworks have been tested (but they might work).

```sh
$ npm install @fattafatta/babel-plugin-rescript-react-to-jsx babel-preset-solid --save-dev

# or

yarn add @fattafatta/babel-plugin-rescript-react-to-jsx babel-preset-solid --dev
```

## Usage

### Via config file

Add this to your `.babelrc`:

```json
{
  "plugins": [ "@fattafatta/babel-plugin-rescript-react-to-jsx" ],
  "presets": [
    "solid"
  ]
}
```

### With `vite`

The normal `vite-plugin-solid` plugin does not work (Because of issues with the order of transformations and file extensions). We have to use babel directly.

Install `vite-plugin-babel` and `@jihchi/vite-plugin-rescript`:

```shell
npm install vite-plugin-babel @jihchi/vite-plugin-rescript --save-dev

# or
yarn add vite-plugin-babel @jihchi/vite-plugin-rescript --dev
```

Configure `vite.config.js`

```js
import { defineConfig } from "vite";
import createReScriptPlugin from "@jihchi/vite-plugin-rescript";
import babel from "vite-plugin-babel";

export default defineConfig({
  plugins: [
    createReScriptPlugin(),
    babel({
      babelConfig: {
        plugins: ["@fattafatta/babel-plugin-rescript-react-to-jsx"],
        presets: ["solid"],
      },
    }),
  ],
});
```
The babel plugin works with either the `.babelrc` file or by passing the config directly.

### Via CLI

Make sure to use the correct file extension when transforming files. ReScript files end on `.bs.js`. But JSX files should use `.jsx`.

```sh
babel --no-babelrc --plugins @fattafatta/babel-plugin-rescript-react-to-jsx script.bs.js > script.jsx
```

## Acknowledgements

This plugin is based on [babel-plugin-transform-react-createelement-to-jsx](https://github.com/flying-sheep/babel-plugin-transform-react-createelement-to-jsx). The original plugin focussed on transforming react jsx only. So it didn't fit the ReScript use case.