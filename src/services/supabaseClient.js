// src/services/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dmvvottzdhgtjqodcxjt.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdnZvdHR6ZGhndGpxb2RjeGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2MTU3MTAsImV4cCI6MjA1MjE5MTcxMH0.QJPvGhyaNeTGGaYC_6bNXCpOF_VrxdfYWBW_AjabQ4A";

  export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Info': 'skillrise-chat-app'
      }
    }
  });