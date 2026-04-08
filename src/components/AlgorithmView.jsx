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

  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(-1);
  const [matrixState, setMatrixState] = useState({ A: [], P: [] });
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [matrixReadHighlights, setMatrixReadHighlights] = useState([]);

  const isFloydMode = algorithmKey === "floyd";

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

    baseLabelByNodeIdRef.current = Object.fromEntries(
      graphData.nodes.map(n => [n.id, n.label ?? String(n.id)])
    );

    if (!isFloydMode) {
      const nodes = new DataSet(graphData.nodes);
      const edges = new DataSet(graphData.edges);

      const network = new Network(containerRef.current, { nodes, edges }, {
        ...graphOptions,
        interaction: {
          ...(graphOptions?.interaction || {}),
          dragNodes: false
        },
        physics: false
      });

      networkRef.current = network;
    } else {
      const initialMatrices = buildInitialFloydMatrices(graphData);
      initialFloydMatricesRef.current = initialMatrices;
      networkRef.current = null;
      setMatrixState(cloneMatrixState(initialMatrices));
      setHighlightedCells([]);
      setMatrixReadHighlights([]);
    }

    const selectedAlgorithm = ALGORITHM_MAP[algorithmKey] ?? ALGORITHM_MAP.dijkstra;
    const generatedSteps = selectedAlgorithm.createSteps(graphData, graphData.nodes[0].id);
    setSteps(generatedSteps);
    setStepIndex(-1);

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
      networkRef.current = null;
    };

  }, [graphData, graphOptions, algorithmKey, isFloydMode]);

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
      } else {
        resetGraphView();
      }
      return;
    }

    renderToIndex(newIndex);
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
            <div className="rounded border border-gray-300 bg-white p-3 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Leyenda de colores (Floyd)</h3>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-blue-800">A[i][k]</span>
                <span className="rounded border border-red-300 bg-red-50 px-2 py-1 text-red-800">A[k][j]</span>
                <span className="rounded border border-purple-300 bg-purple-50 px-2 py-1 text-purple-800">A[i][j]</span>
                <span className="rounded border border-yellow-300 bg-yellow-200 px-2 py-1 text-yellow-900 font-semibold">Celda actualizada</span>
              </div>
            </div>
            {renderMatrix("A")}
            {renderMatrix("P")}
          </div>
        ) : (
          <div className="h-[500px] border" ref={containerRef} />
        )}
        <div className="mt-4 flex gap-2">
          <button
            onClick={prev}
            disabled={!canGoPrev}
            className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            onClick={next}
            disabled={!canGoNext}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
          <button onClick={onBack} className="px-4 py-2 bg-red-500 text-white rounded">
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