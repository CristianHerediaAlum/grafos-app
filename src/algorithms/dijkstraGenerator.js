// src/algorithms/dijkstraGenerator.js

export const dijkstraCppCode = [
"template <typename tCoste>",                          // 0
"vector<tCoste> Dijkstra(const GrafoP<tCoste>& G,",   // 1
"                        typename GrafoP<tCoste>::vertice origen,", // 2
"                        vector<typename GrafoP<tCoste>::vertice>& P)", // 3
"{",                                                      // 4
"   typedef typename GrafoP<tCoste>::vertice vertice;",   // 5
"   vertice v, w;",                                       // 6
"   const size_t n = G.numVert();",                       // 7
"   vector<bool> S(n, false);",                           // 8
"   vector<tCoste> D;",                                   // 9
"",                                                       // 10
"   D = G[origen];",                                      // 11
"   D[origen] = 0;",                                      // 12
"   P = vector<vertice>(n, origen);",                     // 13
"",                                                       // 14
"   S[origen] = true;",                                   // 15
"   for (size_t i = 1; i <= n-2; i++) {",                 // 16
"      tCoste costeMin = GrafoP<tCoste>::INFINITO;",      // 17
"      for (v = 0; v < n; v++)",                          // 18
"         if (!S[v] && D[v] <= costeMin) {",              // 19
"            costeMin = D[v];",                           // 20
"            w = v;",                                     // 21
"         }",                                             // 22
"      S[w] = true;",                                     // 23
"      for (v = 0; v < n; v++)",                          // 24
"         if (!S[v]) {",                                  // 25
"            tCoste Owv = D[w] + G[w][v];",               // 26
"            if (Owv < D[v]) {",                          // 27
"               D[v] = Owv;",                             // 28
"               P[v] = w;",                               // 29
"            }",                                          // 30
"         }",                                             // 31
"   }",                                                   // 32
"   return D;",                                           // 33
"}"                                                       // 34
];


export function* dijkstraSteps(graphData, origen) {

  const nodes = graphData.nodes.map(n => n.id);
  const edges = graphData.edges;
  const n = nodes.length;

  const indexById = new Map(nodes.map((id, idx) => [id, idx]));
  const origenIndex = indexById.get(origen);

  if (origenIndex === undefined) {
    return;
  }

  const parseWeight = (rawWeight) => {
    if (rawWeight === null || rawWeight === undefined || rawWeight === "") {
      return 1;
    }
    const weight = Number(rawWeight);
    return Number.isFinite(weight) ? weight : 1;
  };

  const G = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const edgeByPair = new Map();

  for (let i = 0; i < n; i++) {
    G[i][i] = 0;
  }

  for (const e of edges) {
    const from = indexById.get(e.from);
    const to = indexById.get(e.to);
    if (from === undefined || to === undefined) continue;

    const key = `${from}->${to}`;
    const weight = parseWeight(e.label);
    const previous = edgeByPair.get(key);

    // Si hay aristas paralelas, se usa la de menor coste.
    if (previous === undefined || weight < previous.weight) {
      edgeByPair.set(key, { weight, edgeId: e.id });
      G[from][to] = weight;
    }
  }

  const S = Array(n).fill(false);
  let D = Array(n).fill(Infinity);
  const P = Array(n).fill(origenIndex);

  // Línea 11: D = G[origen]
  yield { line: 11 };
  D = [...G[origenIndex]];

  // Línea 12
  D[origenIndex] = 0;
  yield {
    line: 12,
    highlightNodes: [nodes[origenIndex]],
    update: { node: nodes[origenIndex], distance: 0 }
  };

  // Línea 13
  yield { line: 13 };

  // Línea 15
  S[origenIndex] = true;
  yield {
    line: 15,
    highlightNodes: [nodes[origenIndex]]
  };

  for (let i = 1; i <= n - 2; i++) {

    let w = null;
    let costeMin = Infinity;

    // Línea 17
    yield { line: 17 };

    for (let v = 0; v < n; v++) {

      // Línea 18
      yield { line: 18, highlightNodes: [nodes[v]] };

      if (!S[v] && D[v] <= costeMin) {
        costeMin = D[v];
        w = v;

        // Línea 19
        yield {
          line: 19,
          highlightNodes: [nodes[v]]
        };
      }
    }

    if (w === null || !Number.isFinite(costeMin)) break;

    S[w] = true;

    // Línea 23
    yield {
      line: 23,
      highlightNodes: [nodes[w]]
    };

    for (let v = 0; v < n; v++) {

      // Línea 24
      yield { line: 24, highlightNodes: [nodes[v]] };

      if (!S[v]) {

        const key = `${w}->${v}`;
        const Owv = D[w] + G[w][v];

        // Línea 26
        yield {
          line: 26,
          highlightNodes: [nodes[w], nodes[v]],
          highlightEdges: edgeByPair.has(key) ? [edgeByPair.get(key).edgeId] : []
        };

        // Línea 27
        if (Owv < D[v]) {

          D[v] = Owv;
          P[v] = w;

          // Línea 28
          yield {
            line: 28,
            highlightNodes: [nodes[v]],
            update: { node: nodes[v], distance: Owv }
          };
        }
      }
    }
  }

  yield { line: 33 };
}