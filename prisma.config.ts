import { defineConfig } from '@prisma/config';
export default defineConfig({
  earlyAccess: true,
  test: {
    url: 'postgresql://vms_user:vmspassword@localhost:5433/vmsdb?schema=public',
  },
  development: {
    url: 'postgresql://vms_user:vmspassword@localhost:5433/vmsdb?schema=public',
  },
  production: {
    url: process.env.DATABASE_URL,
  },
});