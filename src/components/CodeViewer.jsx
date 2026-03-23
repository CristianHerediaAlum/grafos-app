// src/components/CodeViewer.jsx

const CodeViewer = ({ code, activeLine }) => {

  return (
    <div className="bg-black text-green-400 p-4 h-[500px] overflow-auto font-mono text-sm rounded">
      {code.map((line, index) => (
        <div
          key={index}
          className={`px-2 whitespace-pre ${
            index === activeLine
              ? "bg-yellow-600 text-black font-bold"
              : ""
          }`}
        >
          {line}
        </div>
      ))}
    </div>
  );
};

export default CodeViewer;