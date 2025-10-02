import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xmcmimfvjgvxuhqfkvnm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtY21pbWZ2amd2eHVocWZrdm5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4MzMwMTAsImV4cCI6MjA1MTQwOTAxMH0.bIGMY6U5OwGNXPJ0jmq4E9xsXAd2vjIU1dDAb9eGmbo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
