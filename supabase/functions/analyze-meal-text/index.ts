import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { handleAnalyzeMealMulti } from '../analyze-meal-multi/handler.ts'
import type { AnalyzeMealMultiRequest } from '../analyze-meal-multi/handler.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return await handleAnalyzeMealMulti(req)
  }

  const body = (await req.json()) as {
    description: string
    userId: string
    mealId?: string
    llm?: AnalyzeMealMultiRequest['llm']
  }

  const payload: AnalyzeMealMultiRequest = {
    userId: body.userId,
    mealId: body.mealId,
    items: [
      {
        itemType: 'text',
        text: body.description,
        quantity: 1,
        orderIndex: 0,
        isHero: false,
      },
    ],
    llm: body.llm,
  }

  const newReq = new Request(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(payload),
  })

  return await handleAnalyzeMealMulti(newReq)
})