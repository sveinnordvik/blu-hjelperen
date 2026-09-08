const fs = require('fs');
let s = fs.readFileSync('server.ts', 'utf8');
s = s.replace(
  '// API routes FIRST',
  `// API routes FIRST
  app.post("/api/debug/key_error", express.json(), (req, res) => {
    console.log("DUPLICATE KEY REPORT:", req.body);
    res.json({ok:true});
  });`
);
fs.writeFileSync('server.ts', s);
