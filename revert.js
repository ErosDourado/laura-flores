const fs = require('fs');
const files = ['admin.html', 'agendamento.html', 'conta.html', 'index.html', 'perfil.html'];
const fbBlock = `const FB = {
  apiKey: "AIzaSyAcZx6vU7bvWx3hzclQ98PfdqulqiQSvX8",
  authDomain: "lauraflores-10360.firebaseapp.com",
  projectId: "lauraflores-10360",
  storageBucket: "lauraflores-10360.firebasestorage.app",
  messagingSenderId: "1043899124552",
  appId: "1:1043899124552:web:afcc0a6ee44cf4edc2017d"
};`;

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace("import { FB } from './firebase-config.js';", fbBlock);
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
});
