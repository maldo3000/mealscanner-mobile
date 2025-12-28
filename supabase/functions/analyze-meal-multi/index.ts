import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleAnalyzeMealMulti } from './handler.ts'

serve(handleAnalyzeMealMulti)














