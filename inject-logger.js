import fs from 'fs';

const filePath = 'src/App.tsx';
let appCode = fs.readFileSync(filePath, 'utf8');

// We will inject a console.error proxy in useEffect of App to catch the duplicate key warning
// But we actually only need the error for the duration of the page load.
const injection = `
  useEffect(() => {
    const origError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('two children with the same key')) {
        // Send a debug beacon
        fetch('http://localhost:3000/api/debug/key_error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: args[0], key: args[1] || 'UNKNOWN_KEY' })
        }).catch(err => {});
      }
      origError.apply(console, args);
    };
    return () => { console.error = origError; };
  }, []);
`;

appCode = appCode.replace('const App = () => {', 'const App = () => {' + injection);

fs.writeFileSync(filePath, appCode);
console.log("App.tsx instrumented to report duplicate keys.");
