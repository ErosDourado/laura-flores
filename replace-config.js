const fs = require('fs');
const files = ['agendamento.html', 'conta.html', 'index.html', 'perfil.html'];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const FB\s*=\s*\{[\s\S]*?afcc0a6ee44cf4edc2017d["']?\s*\};/, "import { FB } from './firebase-config.js';");
  fs.writeFileSync(file, content);
});
