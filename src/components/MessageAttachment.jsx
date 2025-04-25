// src/components/MessageAttachment.jsx
import React, { useEffect, useState } from "react";
import { attachmentService } from "../services/attachmentService";

const MessageAttachment = ({ attachment }) => {
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!attachment) return null;

  const { file_url, file_type, file_name, file_size, thumbnail_url, duration } =
    attachment;

  const isImage = file_type && file_type.startsWith("image/");
  const isAudio = file_type && file_type.startsWith("audio/");
  const isVideo = file_type && file_type.startsWith("video/");
  const isPdf = file_type === "application/pdf";

  // Get download URL on mount
  useEffect(() => {
    const getUrl = async () => {
      if (!file_url) return;

      try {
        setLoading(true);
        // For blob URLs, use directly
        if (file_url.startsWith("blob:")) {
          setDownloadUrl(file_url);
          return;
        }

        // Otherwise get a download URL
        const url = await attachmentService.getDownloadUrl(file_url, file_name);
        setDownloadUrl(url);
      } catch (error) {
        console.error("Error getting download URL:", error);
        setDownloadUrl(file_url); // Fallback to original URL
      } finally {
        setLoading(false);
      }
    };

    getUrl();

    // Cleanup ObjectURLs when component unmounts
    return () => {
      if (downloadUrl && downloadUrl.startsWith("blob:")) {
        URL.revokeObjectURL(downloadUrl);
      }
      if (thumbnail_url && thumbnail_url.startsWith("blob:")) {
        URL.revokeObjectURL(thumbnail_url);
      }
    };
  }, [file_url, file_name, thumbnail_url]);

  // Convert file size to human-readable format
  const formatFileSize = (bytes) => {
    if (!bytes) return "";

    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  // Format duration in seconds to mm:ss
  const formatDuration = (seconds) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formattedSize = formatFileSize(file_size);
  const formattedDuration = formatDuration(duration);

  // Handle file download/view
  const handleDownload = () => {
    if (!downloadUrl) return;

    // Create an invisible anchor and trigger download
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = file_name || "download";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Handle file view (opens in new tab)
  const handleView = () => {
    if (!downloadUrl) return;
    window.open(downloadUrl, "_blank");
  };

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        overflow: "hidden",
        marginTop: "5px",
        marginBottom: "5px",
        maxWidth: "250px",
      }}
    >
      {loading && (
        <div
          style={{
            padding: "10px",
            textAlign: "center",
            color: "#666",
            fontSize: "0.8em",
          }}
        >
          Loading attachment...
        </div>
      )}

      {!loading && downloadUrl && (
        <>
          {isImage && (
            <div style={{ textAlign: "center" }}>
              <img
                src={downloadUrl}
                alt={file_name || "Image attachment"}
                style={{
                  maxWidth: "100%",
                  maxHeight: "200px",
                  objectFit: "contain",
                  cursor: "pointer",
                }}
                onClick={handleView}
              />
            </div>
          )}

          {isAudio && (
            <div style={{ padding: "8px" }}>
              <audio controls style={{ width: "100%", margin: "5px 0" }}>
                <source src={downloadUrl} type={file_type} />
                Your browser does not support the audio element.
              </audio>
              {formattedDuration && (
                <div
                  style={{
                    fontSize: "0.7em",
                    textAlign: "center",
                    color: "#666",
                  }}
                >
                  {formattedDuration}
                </div>
              )}
            </div>
          )}

          {isVideo && (
            <video controls style={{ maxWidth: "100%", maxHeight: "200px" }}>
              <source src={downloadUrl} type={file_type} />
              Your browser does not support the video element.
            </video>
          )}

          {isPdf && (
            <div
              style={{
                padding: "8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                backgroundColor: "#f8f9fa",
              }}
              onClick={handleView}
            >
              <div
                style={{
                  width: "40px",
                  height: "50px",
                  position: "relative",
                  margin: "10px 0",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#e9ecef",
                    border: "1px solid #dee2e6",
                    borderRadius: "2px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#dc3545",
                    fontWeight: "bold",
                    fontSize: "16px",
                  }}
                >
                  PDF
                </div>
              </div>
              <div
                style={{
                  fontSize: "0.9em",
                  fontWeight: "bold",
                  wordBreak: "break-all",
                  textAlign: "center",
                }}
              >
                {file_name || "PDF Document"}
              </div>
              <div
                style={{
                  fontSize: "0.7em",
                  color: "#6c757d",
                  marginTop: "5px",
                }}
              >
                {formattedSize}
              </div>
            </div>
          )}

          {!isImage && !isAudio && !isVideo && !isPdf && (
            <div
              style={{
                padding: "8px",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                backgroundColor: "#f8f9fa",
              }}
              onClick={handleDownload}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  backgroundColor: "#e9ecef",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  marginRight: "8px",
                }}
              >
                <span role="img" aria-label="File">
                  📄
                </span>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.9em",
                    fontWeight: "bold",
                    wordBreak: "break-all",
                  }}
                >
                  {file_name || "File attachment"}
                </div>
                <div style={{ fontSize: "0.7em", color: "#6c757d" }}>
                  {file_type || "Unknown type"}{" "}
                  {formattedSize ? `• ${formattedSize}` : ""}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer with download button */}
      {!loading && downloadUrl && (isImage || isVideo || isPdf) && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "6px 8px",
            backgroundColor: "#f8f9fa",
            borderTop: "1px solid #ddd",
          }}
        >
          <button
            onClick={handleDownload}
            style={{
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              fontSize: "0.8em",
              cursor: "pointer",
            }}
          >
            Download
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageAttachment;
