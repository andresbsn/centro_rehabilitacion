import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';

import { authRouter } from './routes/auth.routes.js';
import { pacientesRouter } from './routes/pacientes.routes.js';
import { obrasSocialesRouter } from './routes/obrasSociales.routes.js';
import { especialidadesRouter } from './routes/especialidades.routes.js';
import { turnosRouter } from './routes/turnos.routes.js';
import { usuariosRouter } from './routes/usuarios.routes.js';
import { configRouter } from './routes/config.routes.js';
import { reportesRouter } from './routes/reportes.routes.js';
import { pagosGimnasioRouter } from './routes/pagosGimnasio.routes.js';

export function buildApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/pacientes', pacientesRouter);
  app.use('/api/obras-sociales', obrasSocialesRouter);
  app.use('/api/especialidades', especialidadesRouter);
  app.use('/api/turnos', turnosRouter);
  app.use('/api/usuarios', usuariosRouter);
  app.use('/api/config', configRouter);
  app.use('/api/reportes', reportesRouter);
  app.use('/api/pagos-gimnasio', pagosGimnasioRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
