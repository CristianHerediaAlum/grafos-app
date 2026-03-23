// src/components/AlgorithmView.jsx

import { useEffect, useRef, useState } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import CodeViewer from "./codeViewer";
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

const AlgorithmView = ({ graphData, graphOptions, algorithmKey = "dijkstra", onBack }) => {

  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const baseLabelByNodeIdRef = useRef({});

  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(-1);

  useEffect(() => {

    if (!graphData?.nodes?.length) {
      setSteps([]);
      setStepIndex(-1);
      return;
    }

    baseLabelByNodeIdRef.current = Object.fromEntries(
      graphData.nodes.map(n => [n.id, n.label ?? String(n.id)])
    );

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

    const selectedAlgorithm = ALGORITHM_MAP[algorithmKey] ?? ALGORITHM_MAP.dijkstra;
    const generatedSteps = selectedAlgorithm.createSteps(graphData, graphData.nodes[0].id);
    setSteps(generatedSteps);
    setStepIndex(-1);

    return () => {
      network.destroy();
      networkRef.current = null;
    };

  }, [graphData, graphOptions, algorithmKey]);

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

  const renderToIndex = (targetIndex) => {

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
      resetGraphView();
      return;
    }

    renderToIndex(newIndex);
  };

  const currentStep = stepIndex >= 0 ? steps[stepIndex] : null;
  const canGoPrev = stepIndex >= 0;
  const canGoNext = stepIndex < steps.length - 1;
  const currentCode = (ALGORITHM_MAP[algorithmKey] ?? ALGORITHM_MAP.dijkstra).code;

  return (
    <div className="flex gap-6">

      <div className="w-2/3">
        <div className="h-[500px] border" ref={containerRef} />
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