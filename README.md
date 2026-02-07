<!--lint disable awesome-heading awesome-github awesome-toc double-link -->

<p align="center">
  <br>
  <img width="400" src="./react-casper-context.png" alt="react casper context logo">
  <br>
  <br>
</p>

<h1 align='center'>React Casper Context</h1>

<p align='center'>
    <h3 align='center'>🚀 Declare it like a normal JavaScript variable. Use it anywhere like React Context.</h3>
<p align='center'>Casper Context is a Babel compile-time plugin that transforms specially prefixed variables into fully functional React Context API state — automatically.
No providers.
No boilerplate.
No complex setup.
Just declare → use → update.</p>

</p>
<!--lint ignore-->



## ✨ Quick Example
### ✅ Declare Context Variable

```jsx
import React from 'react'

function App() {

  let _$_appMessage = 'Say Hi to the Casper';

  return (
    <>
      <CasperHero />
      <MessageBox />
    </>
  );
}
```

### ✅ Use Anywhere In Component Tree

```jsx
import React from 'react'

function CasperHero() {

  return <h1>{_$_appMessage}</h1>;

}

```

### ✅ Update Like Normal Variable

```jsx
import React from 'react';

function MessageBox() {

  const handleChange = () => {
    _$_appMessage = 'Hi Casper';
  } 

  return (
    <>

        <button onClick={handleChange}>
            Change
        </button>

    </>;
}
```

That’s it. Under the hood, the plugin rewrites your code to use the native React Context API. It is 100% React-compliant at runtime.

### ✨ Features

- **Zero Boilerplate:** No more createContext, useContext, or wrapping components manually.
- **Automatic Reactivity:** When a casper variable changes, all components using it re-render automatically..
- **Scoped & Global:** Accessible in the component where it's declared and any nested child component.
- **Native Performance:** Since it compiles to the native React Context API, there is zero overhead compared to writing Context manually.
- **Standard Syntax:** Use familiar assignment syntax to update global state.

### 📦 Installation

```bash
npm install casper-context --save-dev
```
### ⚙️ Setup

#### 1️⃣ Add Babel Plugin
Add it to your `.babelrc` or `babel.config.js`

```json
{
  "plugins": ["casper-context"]
}
```
#### 2️⃣ CRA Users (Important)
Create React App does not support direct Babel modification. You must use CRACO.

Install CRACO:

```bash
npm install @craco/craco
```
Then configure CRACO to inject the Casper Context Babel plugin in package.json

```json
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test",
    "eject": "react-scripts eject"
  }
```
#### 3️⃣ ESLint Setup (Required)
To avoid `undefined` variable warnings
```js
globals: {
  ...require('./casper-eslint.global.js')
}
```

### 🔧 Custom Configuration

By default, the plugin identifies variables using the `_$_` prefix.

```javascript
// Default usage
let _$_myName = 'Jhone';
```
###### Custom Prefix
If you encounter naming collisions or simply prefer a different identifier, you can customize the prefix. Create a `.casperctxrc.json` file in your **project root** and specify your preferred prefix
```json
{
    "prefix": "CCTX"
}
```
Now, the plugin will look for your custom string instead
```jsx
// With custom configuration
let CCTXmyName = 'Jhone';
```

## 📜 The Golden Rules

To ensure Casper Context transforms your code correctly, please follow these core principles:

### 1. Naming & Prefix
Every Casper variable **must** start with the defined prefix (Default: `_$_`).
* **Correct:** `let _$_userName = 'John';`
* **Incorrect:** `let userName = 'John';`

### 2. React Import Requirement
Any file that declares, reads, or writes a Casper variable **must** import React. This is required because the compiled code relies on `React.useContext` and `React.useState`.
* Any valid import works: 
    * `import React from 'react';`
    * `import * as React from 'react';`

### 3. Follow React Hook Rules
Since Casper variables are converted into Hooks under the hood, they must follow the [Rules of Hooks](https://react.dev/warnings/rules-of-hooks):
* Only declare variables at the **top level** of your React function component.
* Do **not** declare them inside loops, conditions, or nested functions.

### 4. Global Uniqueness (Naming)
Currently, Casper variables are treated as globally unique identifiers. You must ensure that every Casper variable name is unique across your entire project, even if they are in different components.
* **Example:** If you have `_$_user` in `ComponentA`, do not use `_$_user` in `ComponentB`. Use `_$_adminUser` or `_$_customerUser` instead.

### 5. Component-Based Context Grouping
Contexts are grouped by the component where the variables are declared.
* All `_$_` variables declared in the **same component** share the **same Context**.
* To create **separate Contexts**, declare your variables in **different components**.



#### Example:
**Context A (Admin Scope):**
```javascript
function Admin() {
    let _$_adminName = 'Jakie';
    let _$_adminAge = 34;
    // These belong to the 'Admin' Context
}
```
**Context B (Customer Scope):**
```javascript
function Customer() {
    let _$_customerName = 'Scot';
    let _$_customerAge = 25;
    // These belong to the 'Customer' Context
}
```

## 🛠 Troubleshooting

If your variables are not becoming reactive or you see errors in the console, check the following:

### 1. Variables are not transforming
* **Check the Prefix**: Ensure your variable starts exactly with your prefix (Default: `_$_`). 
* **Declaration Keyword**: Use `let` or `var` for variables you intend to update. Using `const` will prevent you from reassigning the value later.
* **Babel Cache**: Babel often caches transforms. Try restarting your dev server or clearing the cache (e.g., `rm -rf node_modules/.cache`).

### 2. "Variable is not defined" (ESLint Errors)
Because Casper Context injects variables at compile-time, ESLint might think they are undefined.
* **Solution**: The plugin automatically generates a `casper-eslint.global.js` file in your root. Reference this in your `.eslintrc.js`:
  ```javascript
  const casperGlobals = require('./casper-eslint.global.js');
  module.exports = {
    globals: { ...casperGlobals }
  };
### 3. Changes to `.casperctxrc.json` not reflecting
Babel reads the configuration once when the process starts.
* **Solution**: If you change your custom prefix in `.casperctxrc.json`, you **must restart** your build tool (Vite, Webpack, or Next.js).
### 4. Component not re-rendering
* **Scope**: Ensure the variable is declared within a React Component or a file that is part of the Babel transformation path.

* **Hooks Rules**: Remember that under the hood, this becomes a React Hook. Do not declare `_$_` variables inside nested loops or conditional if statements.
## 📝 Debugging
If you are still having trouble, enable debug mode in your `.casperctxrc.json`
```json
{
    "prefix": "_$_",
    "debug": true
}
```
This will generate a .casperctx.debug.log file in your project root, detailing exactly how the plugin is mapping your variables.

### 🗺 Roadmap
- ✅ CRA Support
- ✅ Babel + Webpack Support
- 🚧 Vite Integration
- 🚧 Next.js Integration
- 🚧 TypeScript Improvements
- 🚧 Developer Tools Integration

### 🤝 Contributing
Contributions, suggestions, and issues are welcome.

### 📜 License
MIT License