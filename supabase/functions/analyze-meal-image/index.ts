import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { handleAnalyzeMealMulti } from '../analyze-meal-multi/handler.ts'
import type { AnalyzeMealMultiRequest } from '../analyze-meal-multi/handler.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    // Delegate OPTIONS handling to the multi handler (keeps consistent CORS headers)
    return await handleAnalyzeMealMulti(req)
  }

  const body = (await req.json()) as {
    imageUrl: string
    userId: string
    mealId?: string
    description?: string
    llm?: AnalyzeMealMultiRequest['llm']
  }

  const payload: AnalyzeMealMultiRequest = {
    userId: body.userId,
    mealId: body.mealId,
    contextText: body.description,
    llm: body.llm,
    items: [
      {
        itemType: 'photo',
        imageUrl: body.imageUrl,
        quantity: 1,
        orderIndex: 0,
        isHero: true,
      },
    ],
  }

  const newReq = new Request(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(payload),
  })

  return await handleAnalyzeMealMulti(newReq)
})