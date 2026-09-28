import { describe, it, expect } from 'vitest';
import { dijkstraSteps } from '../algorithms/dijkstraGenerator.js'; 

describe('Algoritmo de Dijkstra (Función Generadora)', () => {

  it('Debe abortar inmediatamente si el nodo origen no existe', () => {
    const graphData = {
      nodes: [{ id: 'A' }, { id: 'B' }],
      edges: []
    };
    const gen = dijkstraSteps(graphData, 'Z'); // El nodo Z no existe
    const result = gen.next();
    
    // El generador debe terminar con 'done: true' en el primer paso
    expect(result.done).toBe(true); 
  });

  it('Debe calcular las distancias mínimas correctamente en un grafo ponderado', () => {
    // Grafo: A -> B (2), A -> C (5), B -> C (1)
    // Camino mínimo a C debe ser A -> B -> C (coste 3)
    const graphData = {
      nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      edges: [
        { id: 'e1', from: 'A', to: 'B', label: '2' },
        { id: 'e2', from: 'A', to: 'C', label: '5' },
        { id: 'e3', from: 'B', to: 'C', label: '1' }
      ]
    };

    const gen = dijkstraSteps(graphData, 'A');
    const steps = [];
    let current = gen.next();

    // Consumimos toda la función generadora guardando sus yields
    while (!current.done) {
      steps.push(current.value);
      current = gen.next();
    }

    // 1. Debe haber generado varios pasos para la simulación
    expect(steps.length).toBeGreaterThan(0);

    // 2. Comprobamos que el algoritmo pasó por la línea 11 (inicialización)
    const linea11Ejecutada = steps.some(step => step.line === 11);
    expect(linea11Ejecutada).toBe(true);

    // 3. Verificamos matemáticamente el coste final de la actualización del nodo 'C'
    // En algún momento del yield, la distancia de C debió actualizarse a 3 (2 + 1)
    const actualizacionC = steps.find(
      step => step.update && step.update.node === 'C' && step.update.distance === 3
    );
    expect(actualizacionC).toBeDefined();
  });

  it('Debe aplicar peso por defecto (1) si la etiqueta de la arista es nula o vacía', () => {
    const graphData = {
      nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      edges: [
        { id: 'e1', from: 'A', to: 'B', label: '' }, // Etiqueta vacía: peso 1
        { id: 'e2', from: 'B', to: 'C', label: '1' },
        { id: 'e3', from: 'A', to: 'C', label: '5' }
      ]
    };

    const gen = dijkstraSteps(graphData, 'A');
    const steps = [];
    let current = gen.next();
    while (!current.done) {
      steps.push(current.value);
      current = gen.next();
    }

    // El peso por defecto permite llegar a C con coste 2 (A -> B -> C)
    const actualizacionB = steps.find(
      step => step.update && step.update.node === 'C' && step.update.distance === 2
    );
    expect(actualizacionB).toBeDefined();
  });
});