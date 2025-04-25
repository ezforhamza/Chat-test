// src/services/attachmentService.js
import { baseService } from "./baseService";
import { messageService } from "./messageService";

// The bucket name for all chat attachments
const ATTACHMENT_BUCKET = "chat-media-and-attachments";

// Detect if we're running in CodeSandbox
const isCodeSandbox = () => {
  return window.location.hostname.includes('codesandbox.io');
};

const attachmentServiceImpl = {
  // Send a file attachment
  async uploadAttachment(file, messageId, conversationId, senderId) {
    try {
      // Sanitize the file name to remove problematic characters
      const sanitizedFileName = this.sanitizeFileName(file.name);
      
      // Convert file to base64
      const base64File = await this.fileToBase64(file);

      console.log(`Uploading attachment: ${sanitizedFileName}`);
      
      // If running in CodeSandbox, use mock implementation
      if (isCodeSandbox()) {
        console.log("Running in CodeSandbox environment - using mock upload");
        return await this.mockUploadForCodeSandbox(file, messageId, sanitizedFileName);
      }
      
      console.log(`Calling Edge Function to process attachment...`);
      
      // Call the Supabase Edge Function
      const { data, error } = await baseService.supabase.functions.invoke(
        "process-chat-attachment",
        {
          body: JSON.stringify({
            fileData: base64File,
            fileName: sanitizedFileName,
            fileType: file.type,
            messageId,
            conversationId,
            senderId,
            bucketName: ATTACHMENT_BUCKET,
          }),
        }
      );

      if (error) {
        console.error("Edge Function error:", error);
        throw error;
      }
      
      console.log("Edge Function response:", data);
      return data;
    } catch (error) {
      console.error("Error uploading attachment:", error);
      
      // If we're in CodeSandbox and the edge function failed, fall back to mock
      if (isCodeSandbox()) {
        console.log("Falling back to mock implementation for CodeSandbox");
        return await this.mockUploadForCodeSandbox(file, messageId, this.sanitizeFileName(file.name));
      }
      
      throw error;
    }
  },

  // Mock implementation specifically for CodeSandbox
  async mockUploadForCodeSandbox(file, messageId, sanitizedFileName) {
    console.log("Using mock upload for CodeSandbox");
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create a blob URL for the file
    const blobUrl = URL.createObjectURL(file);
    
    // Create a mock attachment object
    const mockAttachment = {
      id: `mock-${Date.now()}`,
      message_id: messageId,
      file_url: blobUrl,
      file_type: file.type,
      file_name: sanitizedFileName,
      file_size: file.size,
      thumbnail_url: file.type.startsWith('image/') ? blobUrl : null,
      created_at: new Date().toISOString()
    };
    
    // Store mock attachment in localStorage for persistence
    this.storeMockAttachment(mockAttachment);
    
    return {
      success: true,
      attachment: mockAttachment
    };
  },
  
  // Store mock attachment in localStorage
  storeMockAttachment(attachment) {
    try {
      const attachments = JSON.parse(localStorage.getItem("mockAttachments") || "{}");
      if (!attachments[attachment.message_id]) {
        attachments[attachment.message_id] = [];
      }
      attachments[attachment.message_id].push(attachment);
      localStorage.setItem("mockAttachments", JSON.stringify(attachments));
    } catch (error) {
      console.error("Error storing mock attachment:", error);
    }
  },

  // Sanitize file name to remove problematic characters
  sanitizeFileName(fileName) {
    // Replace brackets, special characters and spaces with underscores
    return fileName
      .replace(/[\[\](){}]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\s+/g, '_');
  },

  // Send a message with attachment
  async sendMessageWithAttachment(
    conversationId,
    senderId,
    file,
    messageType = "image", // or "file" based on type
    replyToId = null
  ) {
    try {
      // Determine message type from file
      if (!messageType || messageType === "auto") {
        messageType = file.type.startsWith("image/") ? "image" : "file";
      }

      console.log(`Sending ${messageType} attachment: ${file.name}`);

      // First send a placeholder message
      const messageId = await messageService.sendMessage(
        conversationId,
        senderId,
        `Sending ${messageType}...`,
        messageType,
        replyToId
      );

      if (!messageId) throw new Error("Failed to create message");

      console.log(`Created message with ID: ${messageId}, now uploading attachment...`);

      // Then upload the attachment
      const result = await this.uploadAttachment(
        file,
        messageId,
        conversationId,
        senderId
      );

      if (!result.success) {
        console.error("Upload failed:", result.error || "Unknown error");
        throw new Error(result.error || "Failed to upload attachment");
      }

      console.log("Attachment uploaded successfully:", result.attachment);

      // Return the result containing the attachment info
      return {
        messageId,
        attachment: result.attachment,
      };
    } catch (error) {
      console.error("Error in sendMessageWithAttachment:", error);
      throw error;
    }
  },

  // Send a voice message
  async sendVoiceMessage(audioBlob, durationSeconds, conversationId, senderId) {
    try {
      // First send a placeholder message
      const messageId = await messageService.sendMessage(
        conversationId,
        senderId,
        `Voice message (${Math.round(durationSeconds)}s)`,
        "voice"
      );

      if (!messageId) throw new Error("Failed to create message");

      // Create file name and mime type
      const fileName = `voice_message_${Date.now()}.mp3`;
      const file = new File([audioBlob], fileName, { type: "audio/mpeg" });

      // Use the standard attachment upload
      const result = await this.uploadAttachment(
        file,
        messageId,
        conversationId,
        senderId
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to upload voice message");
      }

      // Add duration to the attachment record
      if (result.attachment && result.attachment.id) {
        const { error } = await baseService.supabase
          .from("chat_attachments")
          .update({ duration: Math.round(durationSeconds) })
          .eq("id", result.attachment.id);

        if (error) console.error("Failed to update duration:", error);
      }

      return {
        messageId,
        attachment: result.attachment,
      };
    } catch (error) {
      console.error("Error in sendVoiceMessage:", error);
      throw error;
    }
  },

  // Get attachments for a message
  async getMessageAttachments(messageId) {
    try {
      // Check for mock attachments first (for CodeSandbox)
      if (isCodeSandbox()) {
        try {
          const mockAttachments = JSON.parse(
            localStorage.getItem("mockAttachments") || "{}"
          );
          if (mockAttachments[messageId] && mockAttachments[messageId].length > 0) {
            console.log("Using mock attachments for message", messageId);
            return mockAttachments[messageId];
          }
        } catch (e) {
          console.log("No mock attachments found");
        }
      }

      // Get from database
      const { data, error } = await baseService.supabase
        .from("chat_attachments")
        .select("*")
        .eq("message_id", messageId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting message attachments:", error);
      return [];
    }
  },

  // Generate a downloadable URL for an attachment
  async getDownloadUrl(fileUrl, fileName) {
    // If it's already a blob URL (from mock), return as is
    if (fileUrl.startsWith("blob:")) {
      return fileUrl;
    }

    // If it's a Supabase storage URL, get the download URL
    try {
      // Extract path from the public URL
      const path = fileUrl.split("/").slice(-2).join("/");

      // Get a signed URL for download
      const { data, error } = await baseService.supabase.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrl(path, 60); // 60 seconds expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Error generating download URL:", error);
      return fileUrl; // Fallback to the public URL
    }
  },

  // Helper to convert file to base64
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }
};

// Export the object with proper binding
export const attachmentService = {
  uploadAttachment: attachmentServiceImpl.uploadAttachment.bind(
    attachmentServiceImpl
  ),
  mockUploadForCodeSandbox: attachmentServiceImpl.mockUploadForCodeSandbox.bind(
    attachmentServiceImpl
  ),
  storeMockAttachment: attachmentServiceImpl.storeMockAttachment.bind(
    attachmentServiceImpl
  ),
  sanitizeFileName: attachmentServiceImpl.sanitizeFileName.bind(
    attachmentServiceImpl
  ),
  sendMessageWithAttachment:
    attachmentServiceImpl.sendMessageWithAttachment.bind(attachmentServiceImpl),
  sendVoiceMessage: attachmentServiceImpl.sendVoiceMessage.bind(
    attachmentServiceImpl
  ),
  getMessageAttachments: attachmentServiceImpl.getMessageAttachments.bind(
    attachmentServiceImpl
  ),
  getDownloadUrl: attachmentServiceImpl.getDownloadUrl.bind(
    attachmentServiceImpl
  ),
  fileToBase64: attachmentServiceImpl.fileToBase64.bind(attachmentServiceImpl),
};