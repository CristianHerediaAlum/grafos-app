// src/components/AlgorithmView.jsx

import { useEffect, useRef, useState } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import CodeViewer from "./CodeViewer";
import { dijkstraSteps, dijkstraCppCode } from "../algorithms/dijkstraGenerator";
import { floydSteps, floydCppCode } from "../algorithms/floydGenerator";

const ALGORITHM_MAP = {
  dijkstra: {
    code: dijkstraCppCode,
    createSteps: (graphData, originNodeId) => Array.from(dijkstraSteps(graphData, originNodeId))
  },
  floyd: {
    code: floydCppCode,
    createSteps: (graphData) => Array.from(floydSteps(graphData))
  }
};

const MATRIX_LABELS = {
  A: "Matriz de costes minimos (A)",
  P: "Matriz de vertices intermedios (P)"
};

const FLOYD_READ_ROLE_STYLE = {
  ik: "bg-blue-200",
  kj: "bg-red-200",
  ij: "bg-purple-200"
};

const formatMatrixCell = (value) => {
  if (value === Infinity) return "INF";
  if (value === null || value === undefined) return "-";
  return String(value);
};

const createMatrixState = (size) => ({
  A: Array.from({ length: size }, () => Array(size).fill(Infinity)),
  P: Array.from({ length: size }, () => Array(size).fill(null))
});

const buildInitialFloydMatrices = (graphData) => {
  const nodeIds = graphData?.nodes?.map(n => n.id) || [];
  const size = nodeIds.length;
  const indexById = new Map(nodeIds.map((id, idx) => [id, idx]));

  const parseWeight = (rawWeight) => {
    if (rawWeight === null || rawWeight === undefined || rawWeight === "") {
      return 1;
    }
    const weight = Number(rawWeight);
    return Number.isFinite(weight) ? weight : 1;
  };

  const A = Array.from({ length: size }, () => Array(size).fill(Infinity));
  const P = Array.from({ length: size }, (_, i) => Array(size).fill(nodeIds[i]));

  for (let i = 0; i < size; i++) {
    A[i][i] = 0;
  }

  for (const edge of graphData?.edges || []) {
    const from = indexById.get(edge.from);
    const to = indexById.get(edge.to);
    if (from === undefined || to === undefined) continue;

    const weight = parseWeight(edge.label);
    if (weight < A[from][to]) {
      A[from][to] = weight;
    }
  }

  return { A, P };
};

const cloneMatrixState = (state) => ({
  A: (state?.A || []).map(row => [...row]),
  P: (state?.P || []).map(row => [...row])
});

const AlgorithmView = ({ graphData, graphOptions, algorithmKey = "dijkstra", onBack }) => {

  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const baseLabelByNodeIdRef = useRef({});
  const nodeIdsRef = useRef([]);
  const initialFloydMatricesRef = useRef({ A: [], P: [] });
  const originalFloydEdgesRef = useRef(new Map());

  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(-1);
  const [matrixState, setMatrixState] = useState({ A: [], P: [] });
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [matrixReadHighlights, setMatrixReadHighlights] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [floydViewMode, setFloydViewMode] = useState("matrices"); // 'matrices' | 'graph'

  const isFloydMode = algorithmKey === "floyd";
  const allowFloydNodeDragging = isFloydMode && floydViewMode === "graph";

  const getNetworkOptions = () => ({
    ...graphOptions,
    interaction: {
      ...(graphOptions?.interaction || {}),
      dragNodes: allowFloydNodeDragging
    },
    physics: false
  });

  useEffect(() => {

    if (!graphData?.nodes?.length) {
      setSteps([]);
      setStepIndex(-1);
      setMatrixState({ A: [], P: [] });
      setHighlightedCells([]);
      setMatrixReadHighlights([]);
      initialFloydMatricesRef.current = { A: [], P: [] };
      return;
    }

    nodeIdsRef.current = graphData.nodes.map(n => n.id);

    const isDirectedGraph = Boolean(graphOptions?.edges?.arrows?.to?.enabled);
    const originalEdges = new Map();

    for (const edge of graphData.edges || []) {
      const fromKey = edge.from;
      const toKey = edge.to;
      const pairKey = isDirectedGraph
        ? `${fromKey}->${toKey}`
        : [fromKey, toKey].sort().join("--");

      if (!originalEdges.has(pairKey)) {
        originalEdges.set(pairKey, edge);
      }
    }

    originalFloydEdgesRef.current = originalEdges;

    baseLabelByNodeIdRef.current = Object.fromEntries(
      graphData.nodes.map(n => [n.id, n.label ?? String(n.id)])
    );

    if (!isFloydMode || floydViewMode === "graph") {
      const nodes = new DataSet(graphData.nodes);
      const edges = new DataSet(graphData.edges);

      const network = new Network(containerRef.current, { nodes, edges }, getNetworkOptions());

      networkRef.current = network;
    } else {
      const initialMatrices = buildInitialFloydMatrices(graphData);
      initialFloydMatricesRef.current = initialMatrices;
      if (networkRef.current) {
        try { networkRef.current.destroy(); } catch (e) {}
        networkRef.current = null;
      }
      setMatrixState(cloneMatrixState(initialMatrices));
      setHighlightedCells([]);
      setMatrixReadHighlights([]);
    }

    const selectedAlgorithm = ALGORITHM_MAP[algorithmKey] ?? ALGORITHM_MAP.dijkstra;
    const hasCustomOrigin = graphData.nodes.some(
      (node) => node.id === graphData.algorithmOriginNodeId
    );
    const originNodeId = hasCustomOrigin
      ? graphData.algorithmOriginNodeId
      : graphData.nodes[0].id;
    const generatedSteps = selectedAlgorithm.createSteps(graphData, originNodeId);
    setSteps(generatedSteps);
    setStepIndex(-1);

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
      networkRef.current = null;
    };

  }, [graphData, graphOptions, algorithmKey, isFloydMode, floydViewMode]);

  // Recreate/destroy network when switching floyd view mode
  useEffect(() => {
    if (!isFloydMode) return;

    if (floydViewMode === "graph") {
      // build network from current graphData
      if (!graphData?.nodes?.length) return;
      const nodes = new DataSet(graphData.nodes);
      const edges = new DataSet(graphData.edges);

      try { if (networkRef.current) networkRef.current.destroy(); } catch (e) {}

      const network = new Network(containerRef.current, { nodes, edges }, getNetworkOptions());

      networkRef.current = network;
      // sync network with current matrices
      updateFloydGraphView(matrixState);
    } else {
      if (networkRef.current) {
        try { networkRef.current.destroy(); } catch (e) {}
        networkRef.current = null;
      }
    }
  }, [floydViewMode]);

  useEffect(() => {
    if (!isPlaying || !steps.length) return;

    const interval = setInterval(() => {
      setStepIndex(prevIndex => {
        const newIndex = prevIndex + 1;
        if (newIndex >= steps.length) {
          setIsPlaying(false);
          return prevIndex;
        }
        return newIndex;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  useEffect(() => {
    if (isPlaying && stepIndex >= 0 && stepIndex < steps.length) {
      renderToIndex(stepIndex);
    }
  }, [stepIndex, isPlaying]);

  const togglePlayPause = () => {
    if (!steps.length) return;
    
    if (!isPlaying && stepIndex >= steps.length - 1) {
      setStepIndex(-1);
      if (isFloydMode) {
        const baseMatrices =
          initialFloydMatricesRef.current?.A?.length
            ? initialFloydMatricesRef.current
            : buildInitialFloydMatrices(graphData);
        setMatrixState(cloneMatrixState(baseMatrices));
        setHighlightedCells([]);
        setMatrixReadHighlights([]);
        updateFloydGraphView(baseMatrices);
      } else {
        resetGraphView();
      }
    }
    
    setIsPlaying(!isPlaying);
  };

  const resetGraphView = () => {

    if (!networkRef.current) return;

    const nodes = networkRef.current.body.data.nodes;
    const edges = networkRef.current.body.data.edges;

    nodes.forEach(n => {
      nodes.update({
        id: n.id,
        label: baseLabelByNodeIdRef.current[n.id] ?? String(n.id),
        color: { background: "#97C2FC" }
      });
    });

    edges.forEach(e => {
      edges.update({
        id: e.id,
        color: { color: "#888" }
      });
    });
  };

  const applyUpdate = (step) => {

    if (!networkRef.current || !step?.update) return;

    const nodes = networkRef.current.body.data.nodes;
    const baseLabel = baseLabelByNodeIdRef.current[step.update.node] ?? String(step.update.node);

    nodes.update({
      id: step.update.node,
      label: `${baseLabel}\n(${step.update.distance})`
    });
  };

  const applyHighlight = (step) => {

    if (!networkRef.current || !step) return;

    const nodes = networkRef.current.body.data.nodes;
    const edges = networkRef.current.body.data.edges;

    step.highlightNodes?.forEach(id => {
      nodes.update({
        id,
        color: { background: "#FFAAAA" }
      });
    });

    step.highlightEdges?.forEach(id => {
      edges.update({
        id,
        color: { color: "red" }
      });
    });
  };

  const applyMatrixStep = (targetIndex) => {

    if (!graphData?.nodes?.length) {
      setMatrixState({ A: [], P: [] });
      setHighlightedCells([]);
      return;
    }

    const baseMatrices =
      initialFloydMatricesRef.current?.A?.length
        ? initialFloydMatricesRef.current
        : buildInitialFloydMatrices(graphData);

    const nextState = cloneMatrixState(baseMatrices);

    for (let i = 0; i <= targetIndex; i++) {
      const step = steps[i];
      if (!step) continue;

      step.matrixUpdates?.forEach(({ matrix, i: row, j: col, value }) => {
        if (!nextState[matrix] || nextState[matrix][row] === undefined) return;
        nextState[matrix][row][col] = value;
      });
    }

    const currentStepUpdates = steps[targetIndex]?.matrixUpdates || [];
    const nextHighlights = currentStepUpdates.map(({ matrix, i, j }) => ({ matrix, i, j }));
    const currentStepReadRoles = steps[targetIndex]?.matrixReadRoles || [];

    setMatrixState(nextState);
    setHighlightedCells(nextHighlights);
    setMatrixReadHighlights(currentStepReadRoles);
    updateFloydGraphView(nextState);
  };

  const renderToIndex = (targetIndex) => {

    if (isFloydMode) {
      applyMatrixStep(targetIndex);
      return;
    }

    resetGraphView();

    for (let i = 0; i <= targetIndex; i++) {
      applyUpdate(steps[i]);
    }

    applyHighlight(steps[targetIndex]);
  };

  const next = () => {
    if (!steps.length) return;

    const newIndex = Math.min(stepIndex + 1, steps.length - 1);
    if (newIndex === stepIndex) return;

    setStepIndex(newIndex);
    renderToIndex(newIndex);
  };

  const prev = () => {
    if (stepIndex < 0) return;

    const newIndex = stepIndex - 1;
    setStepIndex(newIndex);

    if (newIndex < 0) {
      if (isFloydMode) {
        const baseMatrices =
          initialFloydMatricesRef.current?.A?.length
            ? initialFloydMatricesRef.current
            : buildInitialFloydMatrices(graphData);
        setMatrixState(cloneMatrixState(baseMatrices));
        setHighlightedCells([]);
        setMatrixReadHighlights([]);
        updateFloydGraphView(baseMatrices);
      } else {
        resetGraphView();
      }
      return;
    }

    renderToIndex(newIndex);
  };

  const goToStart = () => {
    if (stepIndex === -1) return;

    setStepIndex(-1);

    if (isFloydMode) {
      const baseMatrices =
        initialFloydMatricesRef.current?.A?.length
          ? initialFloydMatricesRef.current
          : buildInitialFloydMatrices(graphData);
      setMatrixState(cloneMatrixState(baseMatrices));
      setHighlightedCells([]);
      setMatrixReadHighlights([]);
      updateFloydGraphView(baseMatrices);
    } else {
      resetGraphView();
    }
  };

  const goToEnd = () => {
    if (!steps.length || stepIndex === steps.length - 1) return;

    const newIndex = steps.length - 1;
    setStepIndex(newIndex);
    renderToIndex(newIndex);
  };

  const goToStep = (step) => {
    if (!steps.length) return;

    const stepNum = parseInt(step, 10);
    if (stepNum < 0 || stepNum >= steps.length) return;

    setStepIndex(stepNum);
    renderToIndex(stepNum);
  };

  const currentStep = stepIndex >= 0 ? steps[stepIndex] : null;
  const canGoPrev = stepIndex >= 0;
  const canGoNext = stepIndex < steps.length - 1;
  const currentCode = (ALGORITHM_MAP[algorithmKey] ?? ALGORITHM_MAP.dijkstra).code;

  const isHighlightedCell = (matrix, i, j) =>
    highlightedCells.some(cell => cell.matrix === matrix && cell.i === i && cell.j === j);

  const getReadRoleForCell = (matrix, i, j) => {
    const roles = matrixReadHighlights
      .filter(cell => cell.matrix === matrix && cell.i === i && cell.j === j)
      .map(cell => cell.role);

    if (roles.includes("ij")) return "ij";
    if (roles.includes("ik")) return "ik";
    if (roles.includes("kj")) return "kj";
    return null;
  };

  const updateFloydGraphView = (mat) => {
    if (!networkRef.current || !mat?.A?.length) return;

    const nodeIds = nodeIdsRef.current || [];
    const nodes = networkRef.current.body.data.nodes;
    const edges = networkRef.current.body.data.edges;
    const isDirectedGraph = Boolean(graphOptions?.edges?.arrows?.to?.enabled);
    const displayEdges = [];

    edges.clear();

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = 0; j < nodeIds.length; j++) {
        if (i === j) continue;

        const value = mat.A?.[i]?.[j];
        if (value === undefined || value === Infinity) continue;

        if (!isDirectedGraph && j < i) continue;

        const fromId = nodeIds[i];
        const toId = nodeIds[j];
        const pairKey = isDirectedGraph
          ? `${fromId}->${toId}`
          : [fromId, toId].sort().join("--");
        const originalEdge = originalFloydEdgesRef.current.get(pairKey);
        const isNewEdge = !originalEdge;

        displayEdges.push({
          id: `floyd-${pairKey}`,
          from: originalEdge?.from ?? fromId,
          to: originalEdge?.to ?? toId,
          label: formatMatrixCell(value),
          dashes: isNewEdge,
          color: { color: "#666" },
          arrows: graphOptions?.edges?.arrows,
          font: graphOptions?.edges?.font,
          smooth: graphOptions?.edges?.smooth,
          labelHighlightBold: false
        });
      }
    }

    edges.add(displayEdges);

    // Mantener los nodos intactos y solo actualizar sus etiquetas si existieran en la red.
    nodes.forEach((node) => {
      nodes.update({ id: node.id, label: baseLabelByNodeIdRef.current[node.id] ?? String(node.id) });
    });
  };

  const centerFloydGraphView = () => {
    if (networkRef.current && floydViewMode === "graph") {
      networkRef.current.fit({ animation: { duration: 350, easingFunction: "easeInOutQuad" } });
    }
  };

  const renderMatrix = (matrixKey) => {
    const matrix = matrixState[matrixKey] || [];
    const nodeIds = nodeIdsRef.current;

    if (!matrix.length) return null;

    return (
      <div key={matrixKey} className="rounded border border-gray-300 bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{MATRIX_LABELS[matrixKey]}</h3>
        <div className="overflow-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-100 px-3 py-1 text-gray-700">i\\j</th>
                {nodeIds.map(nodeId => (
                  <th key={`col-${matrixKey}-${nodeId}`} className="border border-gray-300 bg-gray-100 px-3 py-1 text-gray-700">
                    {nodeId}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, rowIndex) => (
                <tr key={`row-${matrixKey}-${rowIndex}`}>
                  <th className="border border-gray-300 bg-gray-100 px-3 py-1 text-gray-700">
                    {nodeIds[rowIndex]}
                  </th>
                  {row.map((value, colIndex) => (
                    (() => {
                      const isUpdated = isHighlightedCell(matrixKey, rowIndex, colIndex);
                      const readRole = isUpdated ? null : getReadRoleForCell(matrixKey, rowIndex, colIndex);
                      const readRoleClass = readRole ? FLOYD_READ_ROLE_STYLE[readRole] : "";
                      const backgroundClass = isUpdated
                        ? "bg-yellow-200"
                        : (readRoleClass || "bg-white");

                      return (
                    <td
                      key={`cell-${matrixKey}-${rowIndex}-${colIndex}`}
                      className={`border border-gray-300 px-3 py-1 text-center text-gray-900 ${backgroundClass} ${
                        isUpdated ? "font-semibold" : ""
                      }`}
                    >
                      {formatMatrixCell(value)}
                    </td>
                      );
                    })()
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-6">

      <div className="w-2/3">
        {isFloydMode ? (
          <div className="h-[500px] overflow-auto space-y-4 border bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="rounded border border-gray-300 bg-white p-3 shadow-sm">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Leyenda de colores (Floyd)</h3>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-blue-800">A[i][k]</span>
                  <span className="rounded border border-red-300 bg-red-50 px-2 py-1 text-red-800">A[k][j]</span>
                  <span className="rounded border border-purple-300 bg-purple-50 px-2 py-1 text-purple-800">A[i][j]</span>
                  <span className="rounded border border-yellow-300 bg-yellow-200 px-2 py-1 text-yellow-900 font-semibold">Celda actualizada</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFloydViewMode("matrices")}
                  className={`px-3 py-2 rounded font-semibold border transition-colors ${floydViewMode === "matrices" ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200"}`}
                >
                  Matrices
                </button>
                <button
                  onClick={() => setFloydViewMode("graph")}
                  className={`px-3 py-2 rounded font-semibold border transition-colors ${floydViewMode === "graph" ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200"}`}
                >
                  Grafo
                </button>
                {floydViewMode === "graph" && (
                  <button
                    onClick={centerFloydGraphView}
                    className="px-3 py-2 rounded font-semibold border border-blue-700 bg-blue-600 text-white transition-colors hover:bg-blue-700 shadow-sm"
                    title="Centrar vista"
                  >
                    Centrar
                  </button>
                )}
              </div>
            </div>

            {floydViewMode === "matrices" ? (
              <>
                {renderMatrix("A")}
                {renderMatrix("P")}
              </>
            ) : (
              <div className="h-[420px] border" ref={containerRef} />
            )}
          </div>
        ) : (
          <div className="h-[500px] border" ref={containerRef} />
        )}
        <div className="mt-4 space-y-3">
          <div className="flex gap-2 items-center justify-between">
            <div className="flex gap-2 items-center">
              <button
                onClick={goToStart}
                disabled={stepIndex === -1}
                className="px-3 py-2 bg-gray-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 font-bold"
                title="Ir al inicio"
              >
                &#171;&#171;
              </button>
              <button
                onClick={prev}
                disabled={!canGoPrev}
                className="px-3 py-2 bg-gray-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 font-bold"
                title="Paso anterior"
              >
                &#60;
              </button>
              <input
                id="stepJump"
                type="number"
                min="0"
                max={steps.length - 1}
                value={stepIndex >= 0 ? stepIndex + 1 : ""}
                onChange={(e) => {
                  if (e.target.value === "") {
                    goToStart();
                  } else {
                    goToStep(parseInt(e.target.value, 10) - 1);
                  }
                }}
                disabled={!steps.length}
                className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed w-16 text-center"
                placeholder="0"
                title="Saltar a paso"
              />
              <button
                onClick={next}
                disabled={!canGoNext}
                className="px-3 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 font-bold"
                title="Paso siguiente"
              >
                &#62;
              </button>
              <button
                onClick={goToEnd}
                disabled={!steps.length || stepIndex === steps.length - 1}
                className="px-3 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 font-bold"
                title="Ir al final"
              >
                &#187;&#187;
              </button>
              <button
                onClick={togglePlayPause}
                disabled={!steps.length}
                className={`px-3 py-2 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed font-bold ${isPlaying ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
                title={isPlaying ? "Pausar" : "Reproducir"}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>
            </div>
            <div className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-2 rounded">
              Paso: <span className="text-blue-600">{stepIndex >= 0 ? stepIndex + 1 : 0}</span> / <span className="text-gray-600">{steps.length}</span>
            </div>
          </div>
          <button onClick={onBack} className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
            Volver
          </button>
        </div>
      </div>

      <div className="w-1/3">
        <CodeViewer
          code={currentCode}
          activeLine={currentStep?.line}
        />
      </div>

    </div>
  );
};

export default AlgorithmView;