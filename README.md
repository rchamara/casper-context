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
function App() {
  let _$_appMessage = ''
  return (
    <div className="App">
      <div className="casper-wrapper">
        <CasperHero />
      </div>

      <div className="message-wrapper">
        <MessageBox />
      </div>
    </div>
  );
}
```

### ✅ Use Anywhere In Component Tree

```jsx
export default function CasperHero() {
  return <h1>{_$_appMessage}</h1>;
}

```

### ✅ Update Like Normal Variable

```jsx
export default function MessageBox() {

  const handleChange = () => {
    _$_appMessage = 'Hi Casper';
  } 
  
  return (
    <div>
        <button onClick={handleChange}>
            Change
        </button>
    </div>;
}
```