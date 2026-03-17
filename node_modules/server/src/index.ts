import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import usuariosRoutes from './routes/usuarios';
import comunidadesRoutes from './routes/comunidades';
import promotoresRoutes from './routes/promotores';
import instructoresRoutes from './routes/instructores';
import capacitacionesRoutes from './routes/capacitaciones';
import proyectosRoutes from './routes/proyectos';
import visitasRoutes from './routes/visitas';
import reportesRoutes from './routes/reportes';
import presupuestoRoutes from './routes/presupuesto';
import proveedoresRoutes from './routes/proveedores';
import requisitosRoutes from './routes/requisitos';
import fotografiasRoutes from './routes/fotografias';
import dashboardRoutes from './routes/dashboard';
import eventosRoutes from './routes/eventos';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/comunidades', comunidadesRoutes);
app.use('/api/promotores', promotoresRoutes);
app.use('/api/instructores', instructoresRoutes);
app.use('/api/capacitaciones', capacitacionesRoutes);
app.use('/api/proyectos', proyectosRoutes);
app.use('/api/visitas', visitasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/presupuesto', presupuestoRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/requisitos-catalogo', requisitosRoutes);
app.use('/api/fotografias', fotografiasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/eventos', eventosRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
