import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        agendamento: resolve(__dirname, 'agendamento.html'),
        conta: resolve(__dirname, 'conta.html'),
        perfil: resolve(__dirname, 'perfil.html'),
      }
    }
  }
});
