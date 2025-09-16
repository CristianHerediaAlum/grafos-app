// src/components/Grafo.jsx
import { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

const Grafo = () => {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodeCounterRef = useRef(6); // Empezar desde 6 ya que tenemos 5 nodos iniciales
  const selectedNodeRef = useRef(null);

  useEffect(() => {
    const nodes = new DataSet([
      { id: 1, label: "Nodo 1" },
      { id: 2, label: "Nodo 2" },
      { id: 3, label: "Nodo 3" },
      { id: 4, label: "Nodo 4" },
      { id: 5, label: "Nodo 5" },
    ]);

    const edges = new DataSet([
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 2, to: 4 },
      { from: 2, to: 5 },
    ]);

    const data = { nodes, edges };

    const options = {
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
        arrows: 'to',
        color: '#888',
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
        dragView: false, // Evitar que se mueva la vista al arrastrar
        zoomView: true,
        selectConnectedEdges: false
      }
    };

    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    // Evento para crear nodos al hacer clic
    const handleClick = (event) => {
      const { pointer, event: originalEvent } = event;
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
      if(e.button === 1) { // Botón central
        e.preventDefault();

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;


        const clickedNodeId = network.getNodeAt({x,y});

        if(clickedNodeId) {
          nodes.remove({id:clickedNodeId});
          console.log(`Nodo ${clickedNodeId} eliminado con clic central.`);
        }

      }
      else if (e.button === 2) { // Botón derecho
        e.preventDefault();
        
        // Obtener las coordenadas relativas al canvas
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convertir coordenadas DOM a coordenadas de canvas
        const clickedNodeId = network.getNodeAt({ x, y });
        // let clickedNodeId = null;
        // const canvasPosition = network.DOMtoCanvas({ x, y });
        
        if (clickedNodeId) {
          if (selectedNodeRef.current === null) {
            selectedNodeRef.current = clickedNodeId;
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
              const existingEdge = edges.get().find(edge => 
                (edge.from === fromId && edge.to === toId) || 
                (edge.from === toId && edge.to === fromId)
              );

              if (!existingEdge) {
                edges.add({ from: fromId, to: toId });
                console.log(`Arista creada entre ${fromId} y ${toId}`);
              } else {
                console.log(`Ya existe una arista entre ${fromId} y ${toId}`);
              }
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
    containerRef.current.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    })

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
      }
      if (networkRef.current) {
        networkRef.current.destroy();
      }
    }

  }, []);

  const clearGraph = () => {
    if (networkRef.current) {
      const nodes = networkRef.current.body.data.nodes;
      const edges = networkRef.current.body.data.edges;
      nodes.clear();
      edges.clear();
      selectedNodeRef.current = null;
      nodeCounterRef.current = 1;
    }
  };

  const clearSelection = () => {
    if (selectedNodeRef.current !== null && networkRef.current) {
      const nodes = networkRef.current.body.data.nodes;
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
  };

  const fitView = () => {
    if (networkRef.current) {
      networkRef.current.fit();
    }
  };

  const addRandomEdge = () => {
    if (networkRef.current) {
      const nodes = networkRef.current.body.data.nodes;
      const edges = networkRef.current.body.data.edges;
      const nodeIds = nodes.getIds();
      if (nodeIds.length < 2) return;
      
      const fromId = nodeIds[Math.floor(Math.random() * nodeIds.length)]; // Tomamos un numero aleatorio y tomamos por defecto
      let toId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
      
      // Evitar self-loops, susceptible a cambio
      while (toId === fromId && nodeIds.length > 1) {
        toId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
      }
      
      // Verificar si la arista ya existe
      const existingEdge = edges.get().find(edge => 
        (edge.from === fromId && edge.to === toId) || 
        (edge.from === toId && edge.to === fromId)
      );
      
      if (!existingEdge) {
        edges.add({
          from: fromId,
          to: toId
        });
      }
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex gap-2 flex-wrap">
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
          onClick={addRandomEdge}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Agregar Arista Aleatoria
        </button>
        <button 
          onClick={clearSelection}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          Cancelar Selección
        </button>
      </div>
      
      <div className="w-full h-[500px] bg-white rounded shadow-md p-4 border-2 border-gray-300">
        <div ref={containerRef} className="w-full h-full cursor-crosshair" />
      </div>
      
      <div className="mt-2 text-sm text-gray-600 space-y-1">
        <p><strong>Clic izquierdo</strong> en área vacía: crear nuevo nodo</p>
        <p><strong>Clic derecho</strong> en nodo: seleccionar para conectar (se pone amarillo)</p>
        <p><strong>Clic derecho</strong> en otro nodo: crear arista entre ambos</p>
        <p><strong>Clic derecho</strong> en área vacía: cancelar selección</p>
        <p><strong>Clic central</strong> en nodo: eliminar nodo</p>
      </div>
    </div>
  );
};

export default Grafo;
