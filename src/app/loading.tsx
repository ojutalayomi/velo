"use client";

export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <div style={{ height: "25px", width: "25px" }} className="loader show"></div>
    </div>
  );
}
