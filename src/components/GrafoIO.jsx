// src/components/GrafoIO.jsx
import React, { useRef, useState, useEffect } from "react";
import {
    generarJson,
    generarTxtLista,
    generarTxtMatriz,
    parsearJson,
    parsearTxtLista,
    parsearTxtListaPonderada,
    parsearTxtMatrizPonderada
} from "../utils/parser.js";

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

    const sanitizeNodes = (nodesArray) =>
        nodesArray.map(n => ({ id: n.id, label: n.label }));

    const sanitizeEdges = (edgesArray) => {
        if (isWeighted) {
            return edgesArray.map(e => ({
                from: e.from,
                to: e.to,
                weight: e.label || "1"
            }));
        }
        return edgesArray.map(e => ({ from: e.from, to: e.to }));
    };

    const processEdgesForCurrentConfig = (edges) => {
        let processedEdges = [...edges];

        if (!isDirected) {
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

        return processedEdges.map(edge => {
            const processedEdge = { from: edge.from, to: edge.to };

            if (isWeighted) {
                if (edge.weight) processedEdge.label = edge.weight;
                else if (edge.label) processedEdge.label = edge.label;
                else processedEdge.label = "1";
            }

            return processedEdge;
        });
    };

    const exportJSON = () => {
        const currentNodes = networkRef.current?.body?.data?.nodes;
        const currentEdges = networkRef.current?.body?.data?.edges;

        if (!currentNodes || !currentEdges) {
            alert("Error: No se pueden obtener los datos del grafo");
            return;
        }

        console.log("Nodos raw:", currentNodes.get());
        console.log("Aristas raw:", currentEdges.get());

        const graph = generarJson(currentNodes.get(), currentEdges.get(), isWeighted);
        console.log("Grafo final:", graph);

        const blob = new Blob([graph], { type: "application/json" });
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
                const processedData = parsearJson(e.target.result, isWeighted, isDirected);

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
                    const graphData = parsearTxtLista(e.target.result, isDirected);

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
                    const { nodes, edges } = parsearTxtListaPonderada(e.target.result, isDirected);

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
                    const graphData = parsearTxtMatrizPonderada(e.target.result, isDirected);

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

        const content = generarTxtLista(nodes, edges, isWeighted, isDirected);

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

        const content = generarTxtMatriz(nodes, edges, isWeighted, isDirected);

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