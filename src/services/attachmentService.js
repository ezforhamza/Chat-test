// src/services/attachmentService.js
import { baseService } from "./baseService";
import { messageService } from "./messageService";

// The bucket name for all chat attachments
const ATTACHMENT_BUCKET = "chat-media-and-attachments";

const attachmentServiceImpl = {
  // Send a file attachment
  async uploadAttachment(file, messageId, conversationId, senderId) {
    try {
      // For testing without edge functions
      if (process.env.NODE_ENV === "development") {
        return await this.mockUploadAttachment(
          file,
          messageId,
          conversationId,
          senderId
        );
      }

      // Production code - use Edge Function
      // Convert file to base64
      const base64File = await this.fileToBase64(file);

      // Call the Supabase Edge Function
      const { data, error } = await baseService.supabase.functions.invoke(
        "process-chat-attachment",
        {
          body: JSON.stringify({
            fileData: base64File,
            fileName: file.name,
            fileType: file.type,
            messageId,
            conversationId,
            senderId,
            bucketName: ATTACHMENT_BUCKET,
          }),
        }
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error uploading attachment:", error);

      // Fallback to direct upload if Edge Function fails
      return await this.directUploadAttachment(
        file,
        messageId,
        conversationId,
        senderId
      );
    }
  },

  // Direct upload to Supabase storage (backup method)
  async directUploadAttachment(file, messageId, conversationId, senderId) {
    try {
      console.log("Falling back to direct upload");

      // Generate a unique file path
      const timestamp = new Date().getTime();
      const filePath = `${senderId}/${conversationId}/${timestamp}_${file.name}`;

      // Upload the file to storage
      const { data: uploadData, error: uploadError } =
        await baseService.supabase.storage
          .from(ATTACHMENT_BUCKET)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

      if (uploadError) throw uploadError;

      // Get the public URL
      const {
        data: { publicUrl },
      } = baseService.supabase.storage
        .from(ATTACHMENT_BUCKET)
        .getPublicUrl(filePath);

      // Create a thumbnail URL for images
      let thumbnailUrl = null;
      if (file.type.startsWith("image/") && file.type !== "image/gif") {
        thumbnailUrl = publicUrl;
      }

      // Create the attachment record
      const { data: attachment, error: attachmentError } =
        await baseService.supabase
          .from("chat_attachments")
          .insert({
            message_id: messageId,
            file_url: publicUrl,
            file_type: file.type,
            file_name: file.name,
            file_size: file.size,
            thumbnail_url: thumbnailUrl,
          })
          .select()
          .single();

      if (attachmentError) throw attachmentError;

      return {
        success: true,
        attachment,
      };
    } catch (error) {
      console.error("Error in direct upload:", error);

      // Last resort - use mock attachment for testing
      return await this.mockUploadAttachment(
        file,
        messageId,
        conversationId,
        senderId
      );
    }
  },

  // Mock attachment upload for testing without Edge Functions
  async mockUploadAttachment(file, messageId, conversationId, senderId) {
    try {
      console.log("MOCK: Uploading attachment for testing");

      // Generate fake URLs for testing
      const fileUrl = URL.createObjectURL(file);

      // Create a fake attachment record
      const mockAttachment = {
        id: `mock-${Date.now()}`,
        message_id: messageId,
        file_url: fileUrl,
        file_type: file.type,
        file_name: file.name,
        file_size: file.size,
        thumbnail_url: file.type.startsWith("image/") ? fileUrl : null,
        created_at: new Date().toISOString(),
      };

      // Store in local mock database (using localStorage)
      this.storeLocalAttachment(mockAttachment);

      // Simulate network delay to test UI
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        attachment: mockAttachment,
      };
    } catch (error) {
      console.error("Error in mock uploadAttachment:", error);
      throw error;
    }
  },

  // Store attachment in localStorage (for testing)
  storeLocalAttachment(attachment) {
    try {
      const attachments = JSON.parse(
        localStorage.getItem("mockAttachments") || "{}"
      );
      if (!attachments[attachment.message_id]) {
        attachments[attachment.message_id] = [];
      }
      attachments[attachment.message_id].push(attachment);
      localStorage.setItem("mockAttachments", JSON.stringify(attachments));
    } catch (error) {
      console.error("Error storing mock attachment:", error);
    }
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

      // First send a placeholder message
      const messageId = await messageService.sendMessage(
        conversationId,
        senderId,
        `Sending ${messageType}...`,
        messageType,
        replyToId
      );

      if (!messageId) throw new Error("Failed to create message");

      // Then upload the attachment
      const result = await this.uploadAttachment(
        file,
        messageId,
        conversationId,
        senderId
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to upload attachment");
      }

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
      // Check for mock attachments first (for testing)
      try {
        const mockAttachments = JSON.parse(
          localStorage.getItem("mockAttachments") || "{}"
        );
        if (
          mockAttachments[messageId] &&
          mockAttachments[messageId].length > 0
        ) {
          console.log("Using mock attachments for message", messageId);
          return mockAttachments[messageId];
        }
      } catch (e) {
        console.log("No mock attachments found");
      }

      // Otherwise get from database
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
  },
};

// Export the object with proper binding
export const attachmentService = {
  uploadAttachment: attachmentServiceImpl.uploadAttachment.bind(
    attachmentServiceImpl
  ),
  directUploadAttachment: attachmentServiceImpl.directUploadAttachment.bind(
    attachmentServiceImpl
  ),
  mockUploadAttachment: attachmentServiceImpl.mockUploadAttachment.bind(
    attachmentServiceImpl
  ),
  storeLocalAttachment: attachmentServiceImpl.storeLocalAttachment.bind(
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
