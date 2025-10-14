import React, { useRef } from "react";

const GrafoIO = ({/*nodes, edges, */ onImport, isWeighted, networkRef, isDirected}) => {
    const fileInputRef = useRef(null);

    // Primero formateamos los nodos y aristas

    const sanitizeNodes = (nodesArray) =>
        nodesArray.map(n => ({ id: n.id, label: n.label }));

    const sanitizeEdges = (edgesArray) => {
        if (isWeighted) {
            return edgesArray.map(e => ({ 
                from: e.from, 
                to: e.to, 
                weight: e.label || "1" 
            }));
        } else {
            return edgesArray.map(e => ({ from: e.from, to: e.to }));
        }
    };

    // Procesar aristas según la configuración actual del grafo
    const processEdgesForCurrentConfig = (edges) => {
        let processedEdges = [...edges];

        // 1. Manejar dirigido/no dirigido
        if (!isDirected) {
            // Si el grafo actual es NO dirigido, eliminar aristas duplicadas bidireccionales
            const uniqueEdges = [];
            const seenPairs = new Set();

            for (const edge of processedEdges) {
                const pair1 = `${edge.from}-${edge.to}`;
                const pair2 = `${edge.to}-${edge.from}`;
                
                if (!seenPairs.has(pair1) && !seenPairs.has(pair2)) {
                    uniqueEdges.push(edge);
                    seenPairs.add(pair1);
                    seenPairs.add(pair2);
                }
            }
            processedEdges = uniqueEdges;
        }

        // 2. Manejar ponderado/no ponderado
        return processedEdges.map(edge => {
            const processedEdge = { from: edge.from, to: edge.to };
            
            if (isWeighted) {
                // Si el grafo actual es ponderado, agregar peso
                if (edge.weight) {
                    processedEdge.label = edge.weight;
                } else if (edge.label) {
                    processedEdge.label = edge.label;
                } else {
                    // Si no tiene peso, asignar peso por defecto
                    processedEdge.label = "1";
                }
            }
            // Si el grafo actual es NO ponderado, no agregar label (pesos se ignoran)
            
            return processedEdge;
        });
    };


    // Exportar a json
    const exportJSON = () => {
        // Obtener las referencias actuales directamente desde la red
        const currentNodes = networkRef.current?.body?.data?.nodes;
        const currentEdges = networkRef.current?.body?.data?.edges;
        
        if (!currentNodes || !currentEdges) {
            alert("Error: No se pueden obtener los datos del grafo");
            return;
        }
        
        console.log("Nodos raw:", currentNodes.get());
        console.log("Aristas raw:", currentEdges.get());
        
        const graph = {
            nodes: sanitizeNodes(currentNodes.get()),
            edges: sanitizeEdges(currentEdges.get()),
        };

        console.log("Grafo final:", graph);

        const blob = new Blob([JSON.stringify(graph, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "grafo.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    // Importar desde JSON
    const importJSON = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validar que el JSON tenga la estructura correcta
                if (!data.nodes || !data.edges || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
                    alert("Formato de archivo JSON inválido. Debe contener 'nodes' y 'edges' como arrays.");
                    return;
                }

                // Validar estructura de nodos
                const isValidNodes = data.nodes.every(node => 
                    node.hasOwnProperty('id') && node.hasOwnProperty('label')
                );

                // Validar estructura de aristas
                const isValidEdges = data.edges.every(edge => {
                    const hasBasicProps = edge.hasOwnProperty('from') && edge.hasOwnProperty('to');
                    // Si es ponderado, no es obligatorio tener label (se puede agregar peso por defecto)
                    return hasBasicProps;
                });

                if (!isValidNodes || !isValidEdges) {
                    const nodeMessage = "Los nodos deben tener 'id' y 'label'";
                    const edgeMessage = "las aristas deben tener 'from' y 'to'" + 
                                       (isWeighted ? " (el 'weight' para el peso es opcional)" : "");
                    alert(`Estructura de datos inválida. ${nodeMessage}, ${edgeMessage}.`);
                    return;
                }

                // Procesar datos para vis-network según configuración actual
                const processedData = {
                    nodes: data.nodes,
                    edges: processEdgesForCurrentConfig(data.edges)
                };

                // Mostrar información sobre ajustes realizados
                let adjustmentMessage = "Grafo importado exitosamente";
                if (!isDirected && data.edges.length !== processedData.edges.length) {
                    adjustmentMessage += `\n• Aristas duplicadas eliminadas para grafo no dirigido (${data.edges.length} → ${processedData.edges.length})`;
                }
                if (isWeighted) {
                    const edgesWithoutWeight = data.edges.filter(e => !e.weight && !e.label).length;
                    if (edgesWithoutWeight > 0) {
                        adjustmentMessage += `\n• ${edgesWithoutWeight} aristas sin peso recibieron peso "1" por defecto`;
                    }
                } else {
                    const edgesWithWeight = data.edges.filter(e => e.weight || e.label).length;
                    if (edgesWithWeight > 0) {
                        adjustmentMessage += `\n• ${edgesWithWeight} pesos de aristas fueron ignorados (grafo no ponderado)`;
                    }
                }
                
                console.log(adjustmentMessage);
                if (adjustmentMessage !== "Grafo importado exitosamente") {
                    alert(adjustmentMessage);
                }

                // Llamar a la función de importación del componente padre
                onImport(processedData);
                console.log("Grafo importado exitosamente");
                
            } catch (error) {
                alert("Error al parsear el archivo JSON: " + error.message);
            }
        };

        reader.readAsText(file);
        // Limpiar el input para permitir seleccionar el mismo archivo otra vez
        event.target.value = '';
    };

    return (
        <div className="flex gap-2">

            <button
                onClick={exportJSON}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
                Exportar JSON
            </button>
            
            <button
                onClick={importJSON}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
            >
                Importar JSON
            </button>
            
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
        </div>
    )

};

export default GrafoIO;