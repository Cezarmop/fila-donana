import { timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config.js';

export function senhaConfere(senha: string): boolean {
  const a = Buffer.from(senha);
  const b = Buffer.from(config.painelSenha);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function gerarToken(): string {
  return jwt.sign({ papel: 'recepcao' }, config.jwtSecret, { expiresIn: '14h' });
}

export function tokenValido(token: string | undefined): boolean {
  if (!token) return false;
  try {
    jwt.verify(token, config.jwtSecret);
    return true;
  } catch {
    return false;
  }
}

export function exigirRecepcao(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!tokenValido(token)) {
    res.status(401).json({ erro: 'Faça login no painel.' });
    return;
  }
  next();
}
