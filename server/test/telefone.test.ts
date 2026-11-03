import { describe, expect, it } from 'vitest';
import { formatarTelefone, normalizarTelefoneBR } from '../src/telefone.js';

describe('normalizarTelefoneBR', () => {
  it.each([
    ['(48) 99999-8888', '5548999998888'],
    ['48999998888', '5548999998888'],
    ['+55 48 99999-8888', '5548999998888'],
    ['4833334444', '554833334444'],
  ])('%s -> %s', (entrada, esperado) => {
    expect(normalizarTelefoneBR(entrada)).toBe(esperado);
  });

  it.each(['', '123', '99999-8888', '0899999888', '48899998888', '+1 415 555 0100'])('rejeita %s', (entrada) => {
    expect(normalizarTelefoneBR(entrada)).toBeNull();
  });
});

it('formatarTelefone', () => {
  expect(formatarTelefone('5548999998888')).toBe('(48) 99999-8888');
  expect(formatarTelefone('554833334444')).toBe('(48) 3333-4444');
});
