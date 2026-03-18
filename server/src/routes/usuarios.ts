import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Rol } from '@prisma/client';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  rol: z.nativeEnum(Rol),
});

router.get('/', authorize('ADMIN'), async (_req, res: Response) => {
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
    orderBy: { nombre: 'asc' },
  });
  res.json(usuarios);
});

router.get('/me', async (req: AuthRequest, res: Response) => {
  const u = await prisma.usuario.findUnique({
    where: { id: req.user!.id },
    select: { id: true, nombre: true, email: true, rol: true, activo: true },
  });
  res.json(u);
});

router.post('/', authorize('ADMIN'), async (req, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { nombre, email, password, rol } = parsed.data;
  const exists = await prisma.usuario.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'Email ya registrado' });

  const hash = await bcrypt.hash(password, 10);
  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      email,
      password: hash,
      rol,
      ...(rol === 'PROMOTOR' ? { promotor: { create: {} } } : {}),
      ...(rol === 'INSTRUCTOR' ? { instructor: { create: {} } } : {}),
    },
    select: { id: true, nombre: true, email: true, rol: true, activo: true },
  });
  res.status(201).json(usuario);
});

router.patch('/:id', authorize('ADMIN'), async (req, res: Response) => {
  const { nombre, activo, password } = req.body;
  const data: Record<string, unknown> = {};
  if (nombre) data.nombre = nombre;
  if (typeof activo === 'boolean') data.activo = activo;
  if (password) data.password = await bcrypt.hash(password, 10);

  const usuario = await prisma.usuario.update({
    where: { id: req.params.id },
    data,
    select: { id: true, nombre: true, email: true, rol: true, activo: true },
  });
  res.json(usuario);
});

router.post('/change-password', async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Se requieren ambas contraseñas' });
  }

  const user = await prisma.usuario.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(400).json({ error: 'La contraseña actual es incorrecta' });

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.usuario.update({
    where: { id: user.id },
    data: { password: hash },
  });

  res.json({ message: 'Contraseña actualizada correctamente' });
});

export default router;
