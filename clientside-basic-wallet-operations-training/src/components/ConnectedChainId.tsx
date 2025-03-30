const ConnectedChainId = ({ currentChainId }: { currentChainId?: number }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          width: "fit-content",
          backgroundColor: "#003a3a",
          padding: "6px",
          marginBottom: "6px",
          borderRadius: "8px",
        }}
      >
        <span>Selected network:</span>
        <span style={{ fontFamily: "monospace", fontSize: "20px" }}>
          {currentChainId ? currentChainId.toString() : "Not connected"}
        </span>
      </div>
    </div>
  );
};

export default ConnectedChainId;
