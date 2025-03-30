const ConnectedAccount = ({ currentAccount }: { currentAccount?: string }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>Connected account:</span>
      <span style={{ fontFamily: "monospace", fontSize: "20px" }}>
        {currentAccount ? currentAccount.toString() : "Not connected"}
      </span>
    </div>
  );
};

export default ConnectedAccount;
