import 'dotenv/config';
import { buildApp } from './app.js';

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = buildApp();

app.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`);
});
