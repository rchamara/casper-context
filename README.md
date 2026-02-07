<!--lint disable awesome-heading awesome-github awesome-toc double-link -->

<p align="center">
  <br>
  <img width="400" src="./react-casper-context.png" alt="react casper context logo">
  <br>
  <br>
</p>

<h1 align='center'>React Casper Context</h1>

<p align='center'>
    <h3>🚀 Declare it like a normal JavaScript variable. Use it anywhere like React Context.</h3>
<br><br>
</p>
<!--lint ignore-->
Casper Context is a Babel compile-time plugin that transforms specially prefixed variables into fully functional React Context API state — automatically.

No providers.
No boilerplate.
No complex setup.

Just declare → use → update.

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