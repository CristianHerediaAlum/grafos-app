export const floydCppCode = [
"template <typename tCoste>",                                           // 0
"matriz<tCoste> Floyd(const GrafoP<tCoste>& G,",                        // 1
"                     matriz<typename GrafoP<tCoste>::vertice>& P)",    // 2
"{",                                                                    // 3
"  typedef typename GrafoP<tCoste>::vertice vertice; ",                 // 4
"   const size_t n = G.numVert();",                                     // 5
"   matriz<tCoste> A(n);   // matriz de costes mínimos",                // 6
"",                                                                     // 7
"   // Iniciar A y P con caminos directos entre cada par de vértices.", // 8
"   P = matriz<vertice>(n);",                                           // 9
"   for (vertice i = 0; i < n; i++) {",                                 // 10
"      A[i] = G[i];                    // copia costes del grafo",      // 11
"      A[i][i] = 0;                    // diagonal a 0",                // 12
"      P[i] = vector<vertice>(n, i);   // caminos directos",            // 13
"   }",                                                                 // 14
"   // Calcular costes mínimos y caminos correspondientes",             // 15
"   // entre cualquier par de vértices i, j",                           // 16
"   for (vertice k = 0; k < n; k++)",                                   // 17
"      for (vertice i = 0; i < n; i++)",                                // 18
"         for (vertice j = 0; j < n; j++) {",                           // 19
"            tCoste ikj = suma(A[i][k], A[k][j]);",                     // 20
"            if (ikj < A[i][j]) {",                                     // 21
"               A[i][j] = ikj;",                                        // 22
"               P[i][j] = k;",                                          // 23
"            }",                                                        // 24
"         }",                                                           // 25
"   return A;",                                                         // 26
"}"                                                                     // 27
];

export function* floydSteps(graphData) {

	const nodes = graphData.nodes.map(n => n.id);
	const edges = graphData.edges;
	const n = nodes.length;

	const indexById = new Map(nodes.map((id, idx) => [id, idx]));

	const parseWeight = (rawWeight) => {
		if (rawWeight === null || rawWeight === undefined || rawWeight === "") {
			return 1;
		}
		const weight = Number(rawWeight);
		return Number.isFinite(weight) ? weight : 1;
	};

	const A = Array.from({ length: n }, () => Array(n).fill(Infinity));
	const P = Array.from({ length: n }, () => Array(n).fill(null));
	const edgeByPair = new Map();

	for (let i = 0; i < n; i++) {
		A[i][i] = 0;
	}

	for (const e of edges) {
		const from = indexById.get(e.from);
		const to = indexById.get(e.to);
		if (from === undefined || to === undefined) continue;

		const key = `${from}->${to}`;
		const weight = parseWeight(e.label);
		const previous = edgeByPair.get(key);

		// Si hay aristas paralelas, se conserva la de menor coste.
		if (previous === undefined || weight < previous.weight) {
			edgeByPair.set(key, { weight, edgeId: e.id });
			A[from][to] = weight;
		}
	}

	// Línea 9
	yield { line: 9 };

	for (let i = 0; i < n; i++) {
		// Línea 10
		yield { line: 10, highlightNodes: [nodes[i]] };

		// Línea 11
		yield { line: 11, highlightNodes: [nodes[i]] };

		A[i][i] = 0;
		// Línea 12
		yield { line: 12, highlightNodes: [nodes[i]] };

		P[i] = Array(n).fill(i);
		// Línea 13
		yield { line: 13, highlightNodes: [nodes[i]] };
	}

	for (let k = 0; k < n; k++) {
		// Línea 17
		yield { line: 17, highlightNodes: [nodes[k]] };

		for (let i = 0; i < n; i++) {
			// Línea 18
			yield { line: 18, highlightNodes: [nodes[i], nodes[k]] };

			for (let j = 0; j < n; j++) {
				// Línea 19
				yield { line: 19, highlightNodes: [nodes[i], nodes[j], nodes[k]] };

				const ikj = A[i][k] + A[k][j];
				const edgeIK = edgeByPair.get(`${i}->${k}`);
				const edgeKJ = edgeByPair.get(`${k}->${j}`);

				// Línea 20
				yield {
					line: 20,
					highlightNodes: [nodes[i], nodes[j], nodes[k]],
					highlightEdges: [edgeIK?.edgeId, edgeKJ?.edgeId].filter(id => id !== undefined)
				};

				// Línea 21
				if (ikj < A[i][j]) {
					yield { line: 21, highlightNodes: [nodes[i], nodes[j], nodes[k]] };

					A[i][j] = ikj;
					// Línea 22
					yield {
						line: 22,
						highlightNodes: [nodes[i], nodes[j]],
						update: {
							node: nodes[j],
							distance: ikj
						}
					};

					P[i][j] = k;
					// Línea 23
					yield { line: 23, highlightNodes: [nodes[i], nodes[j], nodes[k]] };
				}
			}
		}
	}

	yield { line: 26 };
}