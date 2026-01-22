import React, { useRef, useState, useEffect } from "react";

const GrafoIO = ({/*nodes, edges, */ onImport, isWeighted, networkRef, isDirected }) => {
    const fileInputRef = useRef(null);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const dropdownRef = useRef(null);
    const importDropdownRef = useRef(null);

    // Cerrar dropdowns al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsExportOpen(false);
            }
            if (importDropdownRef.current && !importDropdownRef.current.contains(event.target)) {
                setIsImportOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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

    // Funciones de exportación con cierre automático del dropdown
    const handleExportJSON = () => {
        exportJSON();
        setIsExportOpen(false);
    };

    const handleExportTXTList = () => {
        exportTXTList();
        setIsExportOpen(false);
    };

    const handleExportTXTMatrix = () => {
        exportTXTMatrix();
        setIsExportOpen(false);
    };

    // Funciones de importación con cierre automático del dropdown
    const handleImportJSON = () => {
        importJSON();
        setIsImportOpen(false);
    };

    const handleImportTXTListNotWeighted = () => {
        importTXTListNotWeighted();
        setIsImportOpen(false);
    };

    const handleImportTXTListWeighted = () => {
        importTXTListWeighted();
        setIsImportOpen(false);
    };

    const handleImportTXTMatrixWeighted = () => {
        importTXTMatrixWeighted();
        setIsImportOpen(false);
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

    // Importar grafo desde TXT (lista no ponderada)
    const importTXTListNotWeighted = () => {
        if (isWeighted) {
            alert("Se está usando una opción incorrecta de importación");
            return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt';

        input.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const lines = e.target.result
                        .split(/\r?\n/)
                        .map(line => line.trim())
                        .filter(line => line.length > 0);

                    if (lines.length === 0) {
                        alert("El archivo está vacío.");
                        return;
                    }

                    // Leer n (pero NO limitarse a 0..n-1)
                    const n = parseInt(lines[0]);

                    if (n <= 0 || isNaN(n)) {
                        alert("n no válido");
                        return;
                    }

                    // Conjunto de nodos detectados realmente
                    const nodeIds = new Set();

                    const edges = [];
                    const edgeSet = new Set();

                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i];

                        const colonIndex = line.indexOf(':');
                        if (colonIndex === -1) continue;

                        const left = line.substring(0, colonIndex).trim();
                        const right = line.substring(colonIndex + 1).trim();

                        const from = parseInt(left);
                        if (isNaN(from)) continue;

                        nodeIds.add(from);

                        if (!right) continue;

                        const neighbors = right
                            .split(/\s+/)
                            .map(Number)
                            .filter(x => !isNaN(x));

                        neighbors.forEach(to => {
                            nodeIds.add(to);

                            const key = `${from}-${to}`;
                            const revKey = `${to}-${from}`;

                            if (isDirected) {
                                if (!edgeSet.has(key)) {
                                    edges.push({ from, to });
                                    edgeSet.add(key);
                                }
                            } else {
                                if (!edgeSet.has(key) && !edgeSet.has(revKey)) {
                                    edges.push({ from, to });
                                    edgeSet.add(key);
                                    edgeSet.add(revKey);
                                }
                            }
                        });
                    }

                    // Crear nodos REALES detectados
                    const nodes = [...nodeIds].sort((a, b) => a - b).map(id => ({
                        id,
                        label: "Nodo " + id
                    }));

                    const graphData = {
                        nodes,
                        edges: processEdgesForCurrentConfig(edges)
                    };

                    console.log("Grafo importado desde TXT:", graphData);
                    onImport(graphData);

                } catch (error) {
                    console.error("Error al procesar archivo TXT:", error);
                    alert("Error al leer el archivo TXT: " + error.message);
                }
            };

            reader.readAsText(file);
        };

        input.click();
    };

    const importTXTListWeighted = () => {
        if (!isWeighted) {
            alert("Se está usando una opción incorrecta de importación");
            return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt';

        input.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const lines = e.target.result
                        .split(/\r?\n/)
                        .map(line => line.trim())
                        .filter(line => line.length > 0);

                    if (lines.length === 0) {
                        alert("El archivo está vacío.");
                        return;
                    }

                    // Leer n (pero NO limitarse a 0..n-1)
                    const n = parseInt(lines[0]);

                    if (n <= 0 || isNaN(n)) {
                        alert("n no válido");
                        return;
                    }

                    // Conjunto de nodos detectados realmente
                    const nodeIds = new Set();

                    const edges = [];
                    const edgeSet = new Set();

                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i];

                        const colonIndex = line.indexOf(':');
                        if (colonIndex === -1) continue;

                        const left = line.substring(0, colonIndex).trim();
                        const right = line.substring(colonIndex + 1).trim();

                        const from = parseInt(left);
                        if (isNaN(from)) continue;

                        nodeIds.add(from);

                        if (!right) continue;

                        const tokens = right.split(/\s+/); // Ejemplo: ["2", "30", "3", "10"] -> vecino peso vecino peso...

                        for (let t = 0; t < tokens.length; t += 2) {
                            const toToken = tokens[t];
                            const weightToken = tokens[t + 1];

                            const to = parseInt(toToken);
                            if (isNaN(to)) continue;

                            let weight = 1;
                            if (weightToken !== undefined) {
                                const parsed = Number(weightToken);
                                if (!Number.isNaN(parsed)) weight = parsed;
                            }

                            nodeIds.add(to);

                            const key = `${from}-${to}`;
                            const revKey = `${to}-${from}`;

                            if (isDirected) {
                                if (!edgeSet.has(key)) {
                                    edges.push({ from, to,/* weight: weight,*/ label: String(weight) }); // Peso en propiedad weight y label por vis-network
                                    edgeSet.add(key);
                                }
                            } else {
                                if (!edgeSet.has(key) && !edgeSet.has(revKey)) {
                                    edges.push({ from, to, /*weight: weight,*/ label: String(weight) });
                                    edgeSet.add(key);
                                    edgeSet.add(revKey);
                                }
                            }
                        }
                    }

                    // Crear nodos REALES detectados
                    const nodes = [...nodeIds].sort((a, b) => a - b).map(id => ({
                        id,
                        label: "Nodo " + id
                    }));

                    // Para grafos ponderados, mantener los pesos sin procesamiento adicional
                    // const finalEdges = edges.map(edge => ({
                    //     from: edge.from,
                    //     to: edge.to,
                    //     label: String(edge.weight) // vis-network usa 'label' para mostrar texto en las aristas
                    // }));

                    const graphData = {
                        nodes,
                        edges: /*finalEdges */ edges
                    };

                    console.log("Grafo importado desde TXT:", graphData);
                    onImport(graphData);
                    // alert("Grafo ponderado importado exitosamente desde TXT");

                } catch (error) {
                    console.error("Error al procesar archivo TXT:", error);
                    alert("Error al leer el archivo TXT: " + error.message);
                }
            };

            reader.readAsText(file);
        };

        input.click();

    };

    // Importar matriz de adyacencia ponderada desde TXT
    const importTXTMatrixWeighted = () => {
        if (!isWeighted) {
            alert("Se está usando una opción incorrecta de importación. Esta función es para grafos ponderados.");
            return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt';

        input.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const lines = e.target.result
                        .split(/\r?\n/)
                        .map(line => line.trim())
                        .filter(line => line.length > 0);

                    if (lines.length === 0) {
                        alert("El archivo está vacío.");
                        return;
                    }

                    // Leer n (número de nodos)
                    const n = parseInt(lines[0]);

                    if (n <= 0 || isNaN(n)) {
                        alert("Número de nodos inválido");
                        return;
                    }

                    if (lines.length < n + 1) {
                        alert(`El archivo debe contener ${n + 1} líneas (1 para n y ${n} para la matriz)`);
                        return;
                    }

                    // Crear nodos (asumiendo que los IDs van de 1 a n)
                    const nodes = [];
                    for (let i = 1; i <= n; i++) {
                        nodes.push({
                            id: i,
                            label: "Nodo " + i
                        });
                    }

                    // Leer matriz y crear aristas
                    const edges = [];
                    const edgeSet = new Set();
                    const INF = 4294967295; // Valor que representa "no hay arista"

                    for (let i = 1; i <= n; i++) {
                        const line = lines[i];
                        // Dividir por espacios y filtrar valores vacíos
                        const values = line.split(/\s+/).filter(val => val.length > 0);

                        if (values.length !== n) {
                            alert(`La fila ${i} debe contener exactamente ${n} valores. Se encontraron ${values.length}.`);
                            return;
                        }

                        for (let j = 0; j < n; j++) {
                            const weight = parseInt(values[j]);
                            
                            if (isNaN(weight)) {
                                alert(`Valor inválido en la posición [${i-1}][${j}]: "${values[j]}".`);
                                return;
                            }

                            // Si no es INF (hay arista) y no es la diagonal (evitar self-loops a menos que sea necesario)
                            if (weight !== INF) {
                                const from = i; // Ajustar índice (líneas empiezan en 1, IDs de nodos empiezan en 1)
                                const to = j + 1; // Los índices j van de 0 a n-1, pero los IDs van de 1 a n

                                const key = `${from}-${to}`;
                                const revKey = `${to}-${from}`;

                                if (isDirected) {
                                    // Para grafos dirigidos, agregar todas las aristas
                                    if (!edgeSet.has(key)) {
                                        edges.push({ from, to, label: String(weight) });
                                        edgeSet.add(key);
                                    }
                                } else {
                                    // Para grafos no dirigidos, evitar duplicados
                                    if (!edgeSet.has(key) && !edgeSet.has(revKey)) {
                                        edges.push({ from, to, label: String(weight) });
                                        edgeSet.add(key);
                                        edgeSet.add(revKey);
                                    }
                                }
                            }
                        }
                    }

                    const graphData = {
                        nodes,
                        edges
                    };

                    console.log("Grafo importado desde matriz TXT:", graphData);
                    onImport(graphData);
                    
                    // let message = "Grafo importado exitosamente desde matriz de adyacencia";
                    // if (!isDirected) {
                    //     message += "\n• Se procesó como grafo no dirigido (aristas duplicadas eliminadas)";
                    // }
                    // alert(message);

                } catch (error) {
                    console.error("Error al procesar archivo TXT:", error);
                    alert("Error al leer el archivo TXT: " + error.message);
                }
            };

            reader.readAsText(file);
        };

        input.click();
    };

    // Exportar lista de adyacencia a TXT
    const exportTXTList = () => {
        const currentNodes = networkRef.current?.body?.data?.nodes;
        const currentEdges = networkRef.current?.body?.data?.edges;

        if (!currentNodes || !currentEdges) {
            alert("Error: No se pueden obtener los datos del grafo");
            return;
        }

        const nodes = sanitizeNodes(currentNodes.get());
        const edges = sanitizeEdges(currentEdges.get());

        // Crear estructura de adyacencia
        const adjacencyList = new Map();
        nodes.forEach(n => adjacencyList.set(n.id, []));

        edges.forEach(edge => {
            if (isWeighted) {
                adjacencyList.get(edge.from)?.push(`${edge.to} ${edge.weight}`);
                if (!isDirected) adjacencyList.get(edge.to)?.push(`${edge.from} ${edge.weight}`);
            } else {
                adjacencyList.get(edge.from)?.push(`${edge.to}`);
                if (!isDirected) adjacencyList.get(edge.to)?.push(`${edge.from}`);
            }
        });

        // Convertir a texto
        let content = `${nodes.length}\n`;
        nodes.forEach(n => {
            const connections = adjacencyList.get(n.id);
            content += `${n.id}: ${connections.join(" ")}\n`;
        });

        // Descargar el archivo
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "grafo.txt";
        a.click();
        URL.revokeObjectURL(url);
    };

    // Exportar matriz de adyacencia a TXT
    const exportTXTMatrix = () => {
        const currentNodes = networkRef.current?.body?.data?.nodes;
        const currentEdges = networkRef.current?.body?.data?.edges;

        if (!currentNodes || !currentEdges) {
            alert("Error: No se pueden obtener los datos del grafo");
            return;
        }

        const nodes = sanitizeNodes(currentNodes.get());
        const edges = sanitizeEdges(currentEdges.get());

        const n = nodes.length;
        const INF = 4294967295;

        // Crear un mapa de id → índice
        const idToIndex = new Map(nodes.map((node, index) => [node.id, index]));

        // Inicializamos matriz NxN con "infinito"
        const matrix = Array.from({ length: n }, () => Array(n).fill(INF));

        // Rellenamos la matriz usando los índices mapeados
        edges.forEach(edge => {
            const fromIndex = idToIndex.get(edge.from);
            const toIndex = idToIndex.get(edge.to);

            // Evitar errores si el edge tiene nodos que no existen
            if (fromIndex === undefined || toIndex === undefined) return;

            if (isWeighted) {
                const weight = parseInt(edge.weight || edge.label || "1", 10);
                matrix[fromIndex][toIndex] = weight;
                if (!isDirected) matrix[toIndex][fromIndex] = weight;
            } else {
                matrix[fromIndex][toIndex] = 1;
                if (!isDirected) matrix[toIndex][fromIndex] = 1;
            }
        });

        // Convertimos la matriz a texto
        let content = `${n}\n`;
        matrix.forEach(row => {
            content +=
                // "  " +
                row.map(val => String(val).padStart(10, " ")).join(" ") +
                "\n";
        });

        // Descargar archivo
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "grafo.txt";
        a.click();
        URL.revokeObjectURL(url);
    };




    return (
        <div className="flex gap-2">
            {/* Dropdown de exportación */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsExportOpen(!isExportOpen)}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors flex items-center gap-2"
                >
                    Exportar
                    <svg
                        className={`w-4 h-4 transition-transform ${isExportOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isExportOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-full">
                        <button
                            onClick={handleExportJSON}
                            className="w-full px-4 py-2 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors first:rounded-t-md"
                        >
                            JSON
                        </button>
                        <button
                            onClick={handleExportTXTList}
                            className="w-full px-4 py-2 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors border-t border-gray-100"
                        >
                            TXT Lista
                        </button>
                        <button
                            onClick={handleExportTXTMatrix}
                            className="w-full px-4 py-2 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors border-t border-gray-100 last:rounded-b-md"
                        >
                            TXT Matriz
                        </button>
                    </div>
                )}
            </div>

            {/* Dropdown de importación */}
            <div className="relative" ref={importDropdownRef}>
                <button
                    onClick={() => setIsImportOpen(!isImportOpen)}
                    className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors flex items-center gap-2"
                >
                    Importar
                    <svg
                        className={`w-4 h-4 transition-transform ${isImportOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isImportOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-full">
                        <button
                            onClick={handleImportJSON}
                            className="w-full px-4 py-2 text-left text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors first:rounded-t-md"
                        >
                            JSON
                        </button>
                        <button
                            onClick={handleImportTXTListNotWeighted}
                            className="w-full px-4 py-2 text-left text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border-t border-gray-100"
                        >
                            TXT Lista (no ponderada)
                        </button>
                        <button
                            onClick={handleImportTXTListWeighted}
                            className="w-full px-4 py-2 text-left text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border-t border-gray-100"
                        >
                            TXT Lista (ponderada)
                        </button>
                        <button
                            onClick={handleImportTXTMatrixWeighted}
                            className="w-full px-4 py-2 text-left text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border-t border-gray-100 last:rounded-b-md"
                        >
                            TXT Matriz (ponderada)
                        </button>
                    </div>
                )}
            </div>

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