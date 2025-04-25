// src/components/FileUploadButton.jsx
import React, { useRef } from "react";

const FileUploadButton = ({
  onFileSelect,
  disabled = false,
  acceptedTypes = "*",
}) => {
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
      // Reset input so the same file can be selected again
      event.target.value = null;
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptedTypes}
        style={{ display: "none" }}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        style={{
          padding: "6px 10px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span role="img" aria-label="Attachment">
          📎
        </span>{" "}
        Attach
      </button>
    </div>
  );
};

export default FileUploadButton;
