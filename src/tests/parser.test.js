import { describe, it, expect } from 'vitest';
import {
  generarJson,
  generarTxtLista,
  generarTxtMatriz,
  parsearJson,
  parsearTxtLista,
  parsearTxtListaPonderada,
  parsearTxtMatrizPonderada
} from '../utils/parser.js';

describe('Módulo de Importación/Exportación de Archivos (.txt)', () => {
  const nodos = [
    { id: 0, label: 'Nodo 0' },
    { id: 1, label: 'Nodo 1' }
  ];
  const aristasPonderadas = [{ from: 0, to: 1, label: '5' }];

  it('Debe exportar e importar JSON ponderado', () => {
    const json = generarJson(nodos, aristasPonderadas, true);

    expect(JSON.parse(json)).toEqual({
      nodes: nodos,
      edges: [{ from: 0, to: 1, weight: '5' }]
    });
    expect(parsearJson(json, true, true)).toEqual({
      nodes: nodos,
      edges: aristasPonderadas
    });
  });

  it('Debe exportar e importar una lista TXT ponderada', () => {
    const txt = generarTxtLista(nodos, aristasPonderadas, true, true);

    expect(txt).toBe('2\n0: 1 5\n1: \n');
    expect(parsearTxtListaPonderada(txt, true)).toEqual({
      nodes: [
        { id: 0, label: 'Nodo 0' },
        { id: 1, label: 'Nodo 1' }
      ],
      edges: [{ from: 0, to: 1, label: '5' }]
    });
  });

  it('Debe exportar e importar una lista TXT no ponderada', () => {
    const txt = generarTxtLista(nodos, aristasPonderadas, false, true);

    expect(txt).toBe('2\n0: 1\n1: \n');
    expect(parsearTxtLista(txt, true)).toEqual({
      nodes: [
        { id: 0, label: 'Nodo 0' },
        { id: 1, label: 'Nodo 1' }
      ],
      edges: [{ from: 0, to: 1 }]
    });
  });

  it('Debe exportar e importar una matriz TXT ponderada', () => {
    const matrixNodes = [
      { id: 1, label: 'Nodo 1' },
      { id: 2, label: 'Nodo 2' }
    ];
    const matrixEdges = [{ from: 1, to: 2, label: '5' }];
    const txt = generarTxtMatriz(matrixNodes, matrixEdges, true, true);

    expect(txt).toBe(
      '2\n4294967295          5\n4294967295 4294967295\n'
    );
    expect(parsearTxtMatrizPonderada(txt, true)).toEqual({
      nodes: matrixNodes,
      edges: matrixEdges
    });
  });
});