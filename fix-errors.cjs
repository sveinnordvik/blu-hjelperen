const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the handleSendMessage chat error handler
content = content.replace(
  /errorMessage = `\[DEBUG API ERROR\]: \$\{error\?\.message \|\| errorStr\}`;/g,
  `if (error?.message && error.message.includes("Akkurat nå er det veldig stor pågang")) {
        errorMessage = error.message;
      } else {
        errorMessage = \`[DEBUG API ERROR]: \$\{error?.message || errorStr}\`;
      }`
);

// Optional: fix other places where errors are overridden just in case, or just replace the generic error messages.
content = content.replace(
  /let errorMessage = 'Oi! Noe gikk galt under analysen\. Kan du prøve igjen\? ';/,
  `let errorMessage = error?.message?.includes("Akkurat nå er det veldig stor pågang") ? error.message : 'Oi! Noe gikk galt under analysen. Kan du prøve igjen? ';`
);

content = content.replace(
  /let errorMessage = "Oisann! Noe gikk galt under analysen\. Kan du prøve igjen om litt\? Vi heier på deg!";/,
  `let errorMessage = error?.message?.includes("Akkurat nå er det veldig stor pågang") ? error.message : "Oisann! Noe gikk galt under analysen. Kan du prøve igjen om litt? Vi heier på deg!";`
);

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx updated');
