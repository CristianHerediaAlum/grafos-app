export const generarTxtLista = (nodes, edges, isWeighted, isDirected) => {
    const adjacencyList = new Map(nodes.map(node => [node.id, []]));

    edges.forEach(edge => {
        const weight = edge.weight || edge.label || "1";
        const connection = isWeighted ? `${edge.to} ${weight}` : `${edge.to}`;
        adjacencyList.get(edge.from)?.push(connection);

        if (!isDirected) {
            const reverseConnection = isWeighted ? `${edge.from} ${weight}` : `${edge.from}`;
            adjacencyList.get(edge.to)?.push(reverseConnection);
        }
    });

    return `${nodes.length}\n${nodes
        .map(node => `${node.id}: ${adjacencyList.get(node.id).join(" ")}`)
        .join("\n")}\n`;
};

export const parsearTxtListaPonderada = (text, isDirected) => {
    const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (lines.length === 0) throw new Error("El archivo está vacío.");

    const n = parseInt(lines[0]);
    if (n <= 0 || Number.isNaN(n)) throw new Error("n no válido");

    const nodeIds = new Set();
    const edges = [];
    const edgeSet = new Set();

    for (const line of lines.slice(1)) {
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) continue;

        const from = parseInt(line.substring(0, colonIndex).trim());
        if (Number.isNaN(from)) continue;
        nodeIds.add(from);

        const tokens = line.substring(colonIndex + 1).trim().split(/\s+/).filter(Boolean);
        for (let index = 0; index < tokens.length; index += 2) {
            const to = parseInt(tokens[index]);
            if (Number.isNaN(to)) continue;

            const parsedWeight = Number(tokens[index + 1]);
            const weight = Number.isNaN(parsedWeight) ? 1 : parsedWeight;
            nodeIds.add(to);

            const key = `${from}-${to}`;
            const reverseKey = `${to}-${from}`;
            if (!edgeSet.has(key) && (isDirected || !edgeSet.has(reverseKey))) {
                edges.push({ from, to, label: String(weight) });
                edgeSet.add(key);
                if (!isDirected) edgeSet.add(reverseKey);
            }
        }
    }

    const nodes = [...nodeIds].sort((a, b) => a - b).map(id => ({
        id,
        label: "Nodo " + id
    }));

    return { nodes, edges };
};

export const generarJson = (nodes, edges, isWeighted) => {
    const graph = {
        nodes: nodes.map(node => ({ id: node.id, label: node.label })),
        edges: edges.map(edge => {
            const result = { from: edge.from, to: edge.to };
            if (isWeighted) result.weight = edge.label || edge.weight || "1";
            return result;
        })
    };

    return JSON.stringify(graph, null, 2);
};

export const parsearJson = (text, isWeighted, isDirected) => {
    const data = JSON.parse(text);
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
        throw new Error("Formato de archivo JSON inválido");
    }

    const validNodes = data.nodes.every(node =>
        Object.hasOwn(node, "id") && Object.hasOwn(node, "label")
    );
    const validEdges = data.edges.every(edge =>
        Object.hasOwn(edge, "from") && Object.hasOwn(edge, "to")
    );

    if (!validNodes || !validEdges) {
        throw new Error("Estructura de datos inválida");
    }

    let edges = [...data.edges];
    if (!isDirected) {
        const uniqueEdges = [];
        const seenPairs = new Set();

        for (const edge of edges) {
            const pair = `${edge.from}-${edge.to}`;
            const reversePair = `${edge.to}-${edge.from}`;
            if (!seenPairs.has(pair) && !seenPairs.has(reversePair)) {
                uniqueEdges.push(edge);
                seenPairs.add(pair);
                seenPairs.add(reversePair);
            }
        }
        edges = uniqueEdges;
    }

    edges = edges.map(edge => {
        const result = { from: edge.from, to: edge.to };
        if (isWeighted) {
            result.label = edge.weight || edge.label || "1";
        }
        return result;
    });

    return { nodes: data.nodes, edges };
};

export const parsearTxtLista = (text, isDirected) => {
    const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (lines.length === 0) throw new Error("El archivo está vacío.");

    const n = parseInt(lines[0]);
    if (n <= 0 || Number.isNaN(n)) throw new Error("n no válido");

    const nodeIds = new Set();
    const edges = [];
    const edgeSet = new Set();

    for (const line of lines.slice(1)) {
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) continue;

        const from = parseInt(line.substring(0, colonIndex).trim());
        if (Number.isNaN(from)) continue;
        nodeIds.add(from);

        const neighbors = line.substring(colonIndex + 1)
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map(Number)
            .filter(Number.isFinite);

        for (const to of neighbors) {
            nodeIds.add(to);
            const key = `${from}-${to}`;
            const reverseKey = `${to}-${from}`;
            if (!edgeSet.has(key) && (isDirected || !edgeSet.has(reverseKey))) {
                edges.push({ from, to });
                edgeSet.add(key);
                if (!isDirected) edgeSet.add(reverseKey);
            }
        }
    }

    const nodes = [...nodeIds].sort((a, b) => a - b).map(id => ({
        id,
        label: "Nodo " + id
    }));

    return { nodes, edges };
};

export const generarTxtMatriz = (nodes, edges, isWeighted, isDirected) => {
    const inf = 4294967295;
    const idToIndex = new Map(nodes.map((node, index) => [node.id, index]));
    const matrix = Array.from({ length: nodes.length }, () => Array(nodes.length).fill(inf));

    edges.forEach(edge => {
        const fromIndex = idToIndex.get(edge.from);
        const toIndex = idToIndex.get(edge.to);
        if (fromIndex === undefined || toIndex === undefined) return;

        const weight = isWeighted ? parseInt(edge.weight || edge.label || "1", 10) : 1;
        matrix[fromIndex][toIndex] = weight;
        if (!isDirected) matrix[toIndex][fromIndex] = weight;
    });

    return `${nodes.length}\n${matrix
        .map(row => row.map(value => String(value).padStart(10, " ")).join(" "))
        .join("\n")}\n`;
};

export const parsearTxtMatrizPonderada = (text, isDirected) => {
    const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
    const n = parseInt(lines[0]);
    const inf = 4294967295;

    if (n <= 0 || Number.isNaN(n)) throw new Error("Número de nodos inválido");
    if (lines.length < n + 1) throw new Error(`El archivo debe contener ${n + 1} líneas`);

    const nodes = Array.from({ length: n }, (_, index) => ({
        id: index + 1,
        label: "Nodo " + (index + 1)
    }));
    const edges = [];
    const edgeSet = new Set();

    for (let row = 1; row <= n; row++) {
        const values = lines[row].split(/\s+/).filter(Boolean);
        if (values.length !== n) throw new Error(`La fila ${row} no es válida`);

        for (let column = 0; column < n; column++) {
            const weight = parseInt(values[column]);
            if (Number.isNaN(weight)) throw new Error(`Valor inválido en la fila ${row}`);
            if (weight === inf) continue;

            const from = row;
            const to = column + 1;
            const key = `${from}-${to}`;
            const reverseKey = `${to}-${from}`;
            if (!edgeSet.has(key) && (isDirected || !edgeSet.has(reverseKey))) {
                edges.push({ from, to, label: String(weight) });
                edgeSet.add(key);
                if (!isDirected) edgeSet.add(reverseKey);
            }
        }
    }

    return { nodes, edges };
};