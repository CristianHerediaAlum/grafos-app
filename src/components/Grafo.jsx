// src/components/Grafo.jsx
import { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

import GrafoIO from './GrafoIO';
import AlgorithmView from './AlgorithmView';

const getGraphOptions = (isDirected) => ({
  nodes: {
    shape: 'dot',
    size: 20,
    font: { size: 14, color: '#000' },
    color: {
      border: "#2B7CE9",
      background: "#97C2FC",
      highlight: {
        border: "#2B7CE9",
        background: "#D2E5FF"
      }
    }
  },
  edges: {
    arrows: {
      "to": {
        "enabled": isDirected ? true : false
      }
    },
    color: '#888',
    font: {
      color: '#000',
      size: 12,
      background: 'white',
      strokeWidth: 2,
      strokeColor: 'white'
    },
    labelHighlightBold: false,
    smooth: {
      type: 'continuous',
      forceDirection: 'none',
      roundness: 0.1
    },
    selfReference: { size: 20 }
  },
  layout: {
    hierarchical: false,
  },
  physics: {
    enabled: true,
    stabilization: { iterations: 100 }
  },
  interaction: {
    hover: true,
    dragNodes: true,
    dragView: false,
    zoomView: true,
    selectConnectedEdges: false
  }
});

const algorithmOptions = [
  { value: 'dijkstra', label: 'Dijkstra' },
  { value: 'floyd', label: 'Floyd' }
];

const Grafo = () => {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodeCounterRef = useRef(1);
  const selectedNodeRef = useRef(null);
  const algorithmOriginNodeRef = useRef(null);
  const [isNetworkReady, setIsNetworkReady] = useState(false);
  const [isDirected, setIsDirected] = useState(true);
  const [isWeighted, setIsWeighted] = useState(false);
  const [algorithmMode, setAlgorithmMode] = useState(false);
  const [graphSnapshot, setGraphSnapshot] = useState(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('dijkstra');

  useEffect(() => {
    if (algorithmMode) return;

    // Inicializar nodos y aristas
    // const nodes = new DataSet([
    //   { id: 1, label: "Nodo 1" },
    //   { id: 2, label: "Nodo 2" },
    //   { id: 3, label: "Nodo 3" },
    //   { id: 4, label: "Nodo 4" },
    //   { id: 5, label: "Nodo 5" },
    // ]);

    // const edges = new DataSet([
    //   { from: 1, to: 2 },
    //   { from: 1, to: 3 },
    //   { from: 2, to: 4 },
    //   { from: 2, to: 5 },
    // ]);
    const nodes = new DataSet();
    const edges = new DataSet();

    // Resetear el contador cuando se reinicializa el grafo
    nodeCounterRef.current = 1;

    const data = { nodes, edges };

    const options = getGraphOptions(isDirected);

    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;
    setIsNetworkReady(true);

    // Funciones
    const getClickedNodeId = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      return networkRef.current.getNodeAt({ x, y });
    }

    const AddEdgeIfNotExists = (from, to) => {
      const existingEdge = edges.get().find(
        (edge) =>
          (edge.from === from && edge.to === to)
          || (!isDirected && edge.from == to && edge.to == from)
      );

      if (!existingEdge) {
        const newEdge = { from, to };

        if (isWeighted) {
          const weight = prompt(`Introduce el peso de la arista ${from} -> ${to}:`, "1");
          newEdge.label = weight || "1";
        }

        edges.add(newEdge);
        console.log(`Arista creada de ${from} a ${to}`);
      } else {
        console.log(`Ya existe una arista de ${from} a ${to}`);
      }
    }

    // Evento para crear nodos al hacer clic
    const handleClick = (event) => {
      const mouseButton = event?.event?.srcEvent?.button;
      if (mouseButton !== 0) return;

      const { pointer } = event;
      const { canvas } = pointer;

      // Solo crear nodo si no se hizo clic en un nodo existente y es clic izquierdo
      if (event.nodes.length === 0) {
        const nodeId = nodeCounterRef.current;
        const newNode = {
          id: nodeId,
          label: `Nodo ${nodeId}`,
          x: canvas.x,
          y: canvas.y,
          physics: false // Fijar la posición inicial
        };

        nodes.add(newNode);
        nodeCounterRef.current += 1;

        // Después de un momento, habilitar la física para que el nodo se mueva naturalmente
        setTimeout(() => {
          nodes.update({
            id: nodeId,
            physics: true
          });
        }, 100);
      }
    };

    const handleMouseDown = (e) => {
      e.preventDefault();
      const clickedNodeId = getClickedNodeId(e);
      
      if (e.button === 1) { // Botón central
        // Priorizar nodo sobre arista para evitar borrar aristas al intentar borrar nodos.
        if (clickedNodeId) {
          nodes.remove({ id: clickedNodeId });
          if (algorithmOriginNodeRef.current === clickedNodeId) {
            algorithmOriginNodeRef.current = null;
          }
          // No decrementar el contador, mantener secuencia incremental
          console.log(`Nodo ${clickedNodeId} eliminado con clic central.`);
        } else {
          const rect = containerRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const clickedEdgeId = networkRef.current.getEdgeAt({ x, y });

          if (clickedEdgeId) {
            edges.remove({ id: clickedEdgeId });
            console.log(`Arista ${clickedEdgeId} eliminada con clic central.`);
          }
        }

      }
      else if (e.button === 2) { // Botón derecho
        if (clickedNodeId) {
          if (selectedNodeRef.current !== null && !nodes.get(selectedNodeRef.current)) {
            selectedNodeRef.current = null;
          }

          if (selectedNodeRef.current === null) {
            selectedNodeRef.current = clickedNodeId;
            algorithmOriginNodeRef.current = clickedNodeId;
            // Actualizar el color del nodo seleccionado para indicar selección
            nodes.update({
              id: clickedNodeId,
              color: {
                border: "#FF6B6B",
                background: "#FFD93D",
                highlight: {
                  border: "#FF6B6B",
                  background: "#FFD93D"
                }
              }
            });
            console.log(`Nodo ${clickedNodeId} seleccionado. Haz clic derecho en otro nodo para conectar.`);
          } else {
            const fromId = selectedNodeRef.current;
            const toId = clickedNodeId;

            if (fromId !== toId) {
              algorithmOriginNodeRef.current = fromId;
              // const existingEdge = edges.get().find(edge => 
              //   (edge.from === fromId && edge.to === toId)
              //   // || (edge.from === toId && edge.to === fromId)
              // );

              // if (!existingEdge) {
              //   edges.add({ from: fromId, to: toId });
              //   console.log(`Arista creada entre ${fromId} y ${toId}`);
              // } else {
              //   console.log(`Ya existe una arista entre ${fromId} y ${toId}`);
              // }
              AddEdgeIfNotExists(fromId, toId);
            }

            // Restaurar color del nodo previamente seleccionado
            nodes.update({
              id: selectedNodeRef.current,
              color: {
                border: "#2B7CE9",
                background: "#97C2FC",
                highlight: {
                  border: "#2B7CE9",
                  background: "#D2E5FF"
                }
              }
            });

            selectedNodeRef.current = null;
          }
        } else {
          // Si se hace clic derecho en área vacía, deseleccionar
          if (selectedNodeRef.current !== null) {
            nodes.update({
              id: selectedNodeRef.current,
              color: {
                border: "#2B7CE9",
                background: "#97C2FC",
                highlight: {
                  border: "#2B7CE9",
                  background: "#D2E5FF"
                }
              }
            });
            selectedNodeRef.current = null;
            console.log("Selección cancelada");
          }
        }
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    containerRef.current.addEventListener('contextmenu', handleContextMenu);

    network.on("click", handleClick); // solo para clic izquierdo

    containerRef.current.addEventListener('mousedown', handleMouseDown);


    // Ajustar cuando la red se estabiliza inicialmente
    network.once("stabilizationIterationsDone", () => {
      network.fit();
    });

    return () => {
      network.off("click", handleClick);
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousedown', handleMouseDown);
        containerRef.current.removeEventListener('contextmenu', handleContextMenu);
      }
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
      selectedNodeRef.current = null;
      setIsNetworkReady(false);
    }

  }, [isDirected, isWeighted, algorithmMode]);

  const clearGraph = () => {
    if (networkRef.current) {
      const nodes = networkRef.current.body.data.nodes;
      const edges = networkRef.current.body.data.edges;
      nodes.clear();
      edges.clear();
      selectedNodeRef.current = null;
      algorithmOriginNodeRef.current = null;
      nodeCounterRef.current = 1;
    }
  };

  // const clearSelection = () => {
  //   if (selectedNodeRef.current !== null && networkRef.current) {
  //     const nodes = networkRef.current.body.data.nodes;
  //     nodes.update({
  //       id: selectedNodeRef.current,
  //       color: {
  //         border: "#2B7CE9",
  //         background: "#97C2FC",
  //         highlight: {
  //           border: "#2B7CE9",
  //           background: "#D2E5FF"
  //         }
  //       }
  //     });
  //     selectedNodeRef.current = null;
  //     console.log("Selección cancelada");
  //   }
  // };

  const fitView = () => {
    if (networkRef.current) {
      networkRef.current.fit();
    }
  };

  const generateRandomGraph = () => {
    if (!networkRef.current) return;

    // Pedir número de nodos
    const nodeCountInput = prompt("¿Cuántos nodos deseas? (mínimo 1, máximo 20):", "7");
    
    if (nodeCountInput === null) return; // Usuario canceló
    
    let nodeCount = parseInt(nodeCountInput, 10);
    
    // Validar entrada
    if (isNaN(nodeCount) || nodeCount < 1 || nodeCount > 20) {
      alert("Por favor, ingresa un número entre 1 y 20");
      return;
    }

    // Pedir si quiere grafo completo
    const isComplete = confirm("¿Deseas un grafo completo? (todas las aristas posibles)\n\nAceptar = Completo\nCancelar = Aleatorio");

    // Limpiar grafo anterior
    clearGraph();

    const nodes = networkRef.current.body.data.nodes;
    const edges = networkRef.current.body.data.edges;

    const nodeIds = [];

    // Crear los nodos
    for (let i = 0; i < nodeCount; i++) {
      const nodeId = i + 1;
      nodeIds.push(nodeId);
      nodes.add({
        id: nodeId,
        label: `Nodo ${nodeId}`,
        x: Math.random() * 400 - 200,
        y: Math.random() * 400 - 200,
        physics: true
      });
    }

    const createdEdges = new Set();

    if (isComplete) {
      // Grafo completo: conectar todos los nodos
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = 0; j < nodeIds.length; j++) {
          if (i !== j) {
            const fromId = nodeIds[i];
            const toId = nodeIds[j];
            
            // Evitar aristas duplicadas en grafos no dirigidos
            const edgeKey = isDirected ? `${fromId}->${toId}` : [fromId, toId].sort().join('-');
            
            if (!createdEdges.has(edgeKey)) {
              const newEdge = { from: fromId, to: toId };
              
              // Agregar peso si el grafo es ponderado
              if (isWeighted) {
                newEdge.label = String(Math.floor(Math.random() * 9) + 1);
              }
              
              edges.add(newEdge);
              createdEdges.add(edgeKey);
              
              // En grafos no dirigidos, solo crear una arista entre cada par
              if (!isDirected) {
                createdEdges.add([toId, fromId].sort().join('-'));
              }
            }
          }
        }
      }
    } else {
      // Grafo aleatorio: crear aristas aleatorias (30-60% de las posibles)
      const maxEdges = nodeCount * (nodeCount - 1);
      const edgeCount = Math.floor(Math.random() * (maxEdges * 0.3)) + Math.floor(maxEdges * 0.3);

      for (let i = 0; i < edgeCount; i++) {
        const fromId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
        let toId = nodeIds[Math.floor(Math.random() * nodeIds.length)];

        // Evitar self-loops
        while (toId === fromId) {
          toId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
        }

        // Evitar aristas duplicadas (considerando dirección si es dirigido)
        const edgeKey = isDirected ? `${fromId}->${toId}` : [fromId, toId].sort().join('-');
        
        if (!createdEdges.has(edgeKey)) {
          const newEdge = { from: fromId, to: toId };
          
          // Agregar peso si el grafo es ponderado
          if (isWeighted) {
            newEdge.label = String(Math.floor(Math.random() * 9) + 1);
          }
          
          edges.add(newEdge);
          createdEdges.add(edgeKey);
        }
      }
    }

    // Actualizar el contador de nodos
    nodeCounterRef.current = nodeCount + 1;

    // Ajustar física y centrar vista
    setTimeout(() => {
      if (networkRef.current) {
        networkRef.current.fit();
      }
    }, 500);
  };

  const startAlgorithm = () => {
      const nodes = networkRef.current.body.data.nodes.get();
      const edges = networkRef.current.body.data.edges.get();

      if (nodes.length === 0) {
        console.warn("No se puede simular: el grafo no tiene nodos.");
        return;
      }

      const selectedOriginId = algorithmOriginNodeRef.current;
      const hasSelectedOrigin = nodes.some((node) => node.id === selectedOriginId);
      const originNodeId = hasSelectedOrigin ? selectedOriginId : nodes[0].id;

      setGraphSnapshot({ nodes, edges, algorithmOriginNodeId: originNodeId });
      selectedNodeRef.current = null;
      setAlgorithmMode(true);
    };

  if (algorithmMode) {
    return (
      <AlgorithmView
        graphData={graphSnapshot}
        graphOptions={getGraphOptions(isDirected)}
        algorithmKey={selectedAlgorithm}
        onBack={() => setAlgorithmMode(false)}
      />
    );
  }
  return (
    <div className="w-full">
      <div className="mb-4 flex gap-2 flex-wrap">
        {isNetworkReady && (
          <GrafoIO
            // nodes={networkRef.current.body.data.nodes}
            // edges={networkRef.current.body.data.edges}
            isWeighted={isWeighted}
            isDirected={isDirected}
            networkRef={networkRef}
            onImport={(data) => {
              const nodes = networkRef.current.body.data.nodes;
              const edges = networkRef.current.body.data.edges;
              nodes.clear();
              edges.clear();
              nodes.add(data.nodes);
              edges.add(data.edges);
              networkRef.current.fit(); // centra el grafo importado

              const maxId = Math.max(...data.nodes.map(n => n.id), 0);
              nodeCounterRef.current = maxId + 1;
              selectedNodeRef.current = null;
              algorithmOriginNodeRef.current = null;
            }}
          >
          </GrafoIO>
        )}
        <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={isDirected}
            onChange={() => setIsDirected(!isDirected)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          Dirigido
        </label>
        <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={isWeighted}
            onChange={() => setIsWeighted(!isWeighted)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          Ponderado
        </label>
        <button
          onClick={clearGraph}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Limpiar Grafo
        </button>
        <button
          onClick={fitView}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Centrar Vista
        </button>
        <button
          onClick={generateRandomGraph}
          className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition-colors"
        >
          Generar Grafo Aleatorio
        </button>
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded">
          <span>Algoritmo:</span>
          <select
            value={selectedAlgorithm}
            onChange={(e) => setSelectedAlgorithm(e.target.value)}
            className="bg-white border border-gray-300 rounded px-2 py-1"
          >
            {algorithmOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={startAlgorithm}
          className="px-4 py-2 bg-purple-600 text-white rounded"
        >
          Simular {algorithmOptions.find(a => a.value === selectedAlgorithm)?.label || 'Algoritmo'}
        </button>
        {/* {
          <button 
            onClick={addRandomEdge}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Agregar Arista Aleatoria
          </button>
        } */
        }
        {/*
        <button 
          onClick={clearSelection}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          Cancelar Selección
        </button>
        */}
      </div>

      <div className="w-full h-[500px] bg-white rounded shadow-md p-4 border-2 border-gray-300">
        <div ref={containerRef} className="w-full h-full cursor-crosshair" />
      </div>

      <div className="mt-2 text-sm text-gray-600 space-y-1">
        <p><strong>Clic izquierdo</strong> en área vacía: crear nuevo nodo</p>
        <p><strong>Clic izquierdo</strong> en un nodo y arrastrar: mover el nodo</p>
        <p><strong>Clic derecho</strong> en nodo: seleccionar para conectar (se pone amarillo)</p>
        <p><strong>Clic derecho</strong> en nodo: seleccionar para nodo origen con Dijkstra (se pone amarillo)</p>
        <p><strong>Clic derecho</strong> en otro nodo: crear arista entre ambos</p>
        <p><strong>Clic derecho</strong> en área vacía: cancelar selección</p>
        <p><strong>Clic central</strong> en nodo: eliminar nodo</p>
        <p><strong>Clic central</strong> en arista: eliminar arista</p>
      </div>
    </div>
  );
};


export default Grafo;
