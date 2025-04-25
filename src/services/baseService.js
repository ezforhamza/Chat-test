// src/services/baseService.js
import { supabase } from "./supabaseClient";

// Base service with shared functionality
export const baseService = {
  supabase,

  // Generic error handler
  handleError(error, operation) {
    console.error(`Error in ${operation}:`, error);
    throw error;
  },
};
