import React, { useRef } from "react";

const GrafoIO = ({nodes, edges, onImport}) => {
    const fileInputRef = useRef(null);

    // Primero formateamos los nodos y aristas

    const sanitizeNodes = (nodesArray) =>
        nodesArray.map(n => ({ id: n.id, label: n.label }));

    const sanitizeEdges = (edgesArray) =>
        edgesArray.map(e => ({ from: e.from, to: e.to }));


    // Exportar a json
    const exportJSON = () => {
        const graph = {
            nodes: sanitizeNodes(nodes.get()),
            edges: sanitizeEdges(edges.get()),
        };

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
                const isValidEdges = data.edges.every(edge => 
                    edge.hasOwnProperty('from') && edge.hasOwnProperty('to')
                );

                if (!isValidNodes || !isValidEdges) {
                    alert("Estructura de datos inválida. Los nodos deben tener 'id' y 'label', las aristas deben tener 'from' y 'to'.");
                    return;
                }

                // Llamar a la función de importación del componente padre
                onImport(data);
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