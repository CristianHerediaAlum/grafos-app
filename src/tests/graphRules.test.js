import { describe, it, expect } from 'vitest';

describe('Reglas de Topología y Ponderación del Grafo', () => {
  
  const parseWeight = (rawWeight) => {
    if (rawWeight === null || rawWeight === undefined || rawWeight === "") return 1;
    const weight = Number(rawWeight);
    return Number.isFinite(weight) ? weight : 1;
  };

  it('Debe transformar los pesos vacíos en 1', () => {
    expect(parseWeight("")).toBe(1);
    expect(parseWeight(null)).toBe(1);
    expect(parseWeight(undefined)).toBe(1);
  });

  it('Debe convertir strings numéricos a números', () => {
    expect(parseWeight("5")).toBe(5);
    expect(parseWeight("10.5")).toBe(10.5);
    expect(parseWeight("-3")).toBe(-3);
  });

  it('Debe aplicar peso 1 si se introduce un texto no numérico', () => {
    expect(parseWeight("texto_invalido")).toBe(1);
    expect(parseWeight("NaN")).toBe(1);
  });
});