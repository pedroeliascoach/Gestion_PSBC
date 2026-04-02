import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const usuario = await prisma.usuario.findUnique({ 
    where: { email },
    include: { 
      instructor: true,
      proveedor: true,
      promotor: true
    }
  });

  if (!usuario || !usuario.activo) return res.status(401).json({ error: 'Credenciales inválidas' });

  const valid = await bcrypt.compare(password, usuario.password);
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

  // Verificar si tiene múltiples perfiles (Instructor y Proveedor)
  const rolesDisponibles: string[] = [];
  if (usuario.rol === 'ADMIN') rolesDisponibles.push('ADMIN');
  if (usuario.promotor) rolesDisponibles.push('PROMOTOR');
  if (usuario.instructor) rolesDisponibles.push('INSTRUCTOR');
  if (usuario.proveedor) rolesDisponibles.push('PROVEEDOR');

  // Si tiene ambos perfiles (Instructor y Proveedor) y no se ha especificado uno, pedir selección
  if (rolesDisponibles.includes('INSTRUCTOR') && rolesDisponibles.includes('PROVEEDOR') && !req.body.selectedRole) {
    return res.json({
      requiresSelection: true,
      roles: ['INSTRUCTOR', 'PROVEEDOR'],
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email }
    });
  }

  const roleToUse = req.body.selectedRole || usuario.rol;

  const token = jwt.sign(
    { id: usuario.id, rol: roleToUse, email: usuario.email },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '8h' }
  );

  return res.json({
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: roleToUse },
  });
});

export default router;
