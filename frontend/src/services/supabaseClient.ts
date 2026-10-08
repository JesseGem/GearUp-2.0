import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxdsflzrlmiftsbkketb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZHNmbHpybG1pZnRzYmtrZXRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNjEwMTUsImV4cCI6MjA5ODczNzAxNX0._tGVl61ocZYOrzHM-_EieZdhbMPyx87zJz_dey8iArA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});