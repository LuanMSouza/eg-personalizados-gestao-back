import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
    'https://dzgmzagxnhlhiojvfftq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6Z216YWd4bmhsaGlvanZmZnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzAyMDcsImV4cCI6MjA5MjYwNjIwN30.PymIWfak2r2IwMDLQNB0-mms5LH63vwQnd-g1JiAA5E'
)