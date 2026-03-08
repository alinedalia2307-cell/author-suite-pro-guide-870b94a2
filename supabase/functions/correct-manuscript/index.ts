import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, lang } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No text provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const langName = lang === "es" ? "español" : lang === "en" ? "English" : lang === "fr" ? "français" : lang === "pt" ? "português" : lang === "de" ? "Deutsch" : "español";

    const systemPrompt = `Eres un corrector profesional de manuscritos literarios en ${langName}. Analiza el texto proporcionado y devuelve correcciones usando la función proporcionada.

Reglas:
- Identifica errores de ortografía, gramática y puntuación.
- Sugiere mejoras de estilo cuando el texto sea redundante, confuso o poco fluido.
- Cada corrección debe incluir: el fragmento original, la sugerencia corregida, el tipo (ortografía, gramática, estilo, puntuación) y una breve explicación.
- Si el texto no tiene errores, devuelve una lista vacía de correcciones.
- Máximo 20 correcciones por solicitud.
- No inventes errores donde no los hay.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text.slice(0, 8000) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_corrections",
              description: "Return a list of corrections found in the manuscript text.",
              parameters: {
                type: "object",
                properties: {
                  corrections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        original: { type: "string", description: "The original text fragment with the issue" },
                        suggestion: { type: "string", description: "The corrected version" },
                        type: { type: "string", enum: ["ortografía", "gramática", "estilo", "puntuación"], description: "Type of correction" },
                        explanation: { type: "string", description: "Brief explanation of why the change is suggested" },
                      },
                      required: ["original", "suggestion", "type", "explanation"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string", description: "Brief overall assessment of the text quality" },
                },
                required: ["corrections", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_corrections" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Inténtalo de nuevo en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Añade créditos en Configuración > Workspace > Uso." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Error al conectar con el servicio de IA." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ corrections: [], summary: "No se pudieron analizar las correcciones." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("correct-manuscript error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
