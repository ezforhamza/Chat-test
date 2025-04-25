// src/components/FilePreview.jsx
import React from "react";

const FilePreview = ({ file, onCancel }) => {
  if (!file) return null;

  const isImage = file.type.startsWith("image/");
  const filePreviewUrl = isImage ? URL.createObjectURL(file) : null;

  // Convert file size to human-readable format
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  // Clean up when component unmounts
  React.useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "4px",
        padding: "8px",
        marginBottom: "10px",
        backgroundColor: "#f8f9fa",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        {isImage ? (
          <div style={{ marginRight: "10px" }}>
            <img
              src={filePreviewUrl}
              alt="Preview"
              style={{
                maxWidth: "100px",
                maxHeight: "100px",
                borderRadius: "4px",
              }}
            />
          </div>
        ) : (
          <div
            style={{
              marginRight: "10px",
              width: "40px",
              height: "40px",
              backgroundColor: "#e9ecef",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
            }}
          >
            <span role="img" aria-label="File">
              📄
            </span>
          </div>
        )}

        <div>
          <div style={{ fontWeight: "bold", wordBreak: "break-all" }}>
            {file.name}
          </div>
          <div style={{ fontSize: "0.8em", color: "#6c757d" }}>
            {file.type || "Unknown type"} • {formatFileSize(file.size)}
          </div>
        </div>
      </div>

      <button
        onClick={onCancel}
        style={{
          position: "absolute",
          top: "5px",
          right: "5px",
          border: "none",
          background: "transparent",
          fontSize: "20px",
          cursor: "pointer",
          color: "#6c757d",
        }}
      >
        &times;
      </button>
    </div>
  );
};

export default FilePreview;
