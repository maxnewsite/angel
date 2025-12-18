import { corsHeaders, maybeHandleCors } from "../_shared/cors.ts";
import { adminClient, requireRole } from "../_shared/supabase.ts";

// No PDF parsing library needed - Claude can read PDFs directly!

Deno.serve(async (req) => {
  const cors = maybeHandleCors(req);
  if (cors) return cors;

  try {
    const { user } = await requireRole(req, ["admin", "dealflow_manager", "dealflow_analyst"]);

    const { deal_id } = await req.json();
    const dealId = String(deal_id ?? "");

    if (!dealId) {
      return new Response(JSON.stringify({ error: "deal_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch deal details
    const { data: deal, error: dealErr } = await adminClient
      .from("deals")
      .select(`
        id,
        startup:startup_id(name,sector,description),
        round_type,
        target_amount,
        valuation,
        highlights,
        risks,
        use_of_funds
      `)
      .eq("id", dealId)
      .single();

    if (dealErr || !deal) {
      return new Response(JSON.stringify({ error: "Deal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch pitch deck document
    const { data: docs, error: docErr } = await adminClient
      .from("documents")
      .select("storage_path,file_name")
      .eq("deal_id", dealId)
      .eq("visibility", "internal")
      .order("created_at", { ascending: false })
      .limit(1);

    if (docErr || !docs || docs.length === 0) {
      return new Response(JSON.stringify({ error: "No pitch deck found for this deal" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const doc = docs[0];

    // Download PDF from storage
    const { data: pdfData, error: downloadErr } = await adminClient.storage
      .from("deal-docs")
      .download(doc.storage_path);

    if (downloadErr || !pdfData) {
      return new Response(JSON.stringify({ error: "Failed to download pitch deck" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert PDF to base64 for Claude API (handle large files properly)
    const pdfBuffer = await pdfData.arrayBuffer();
    const bytes = new Uint8Array(pdfBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const pdfBase64 = btoa(binary);

    // Fetch screening criteria
    const { data: criteria, error: criteriaErr } = await adminClient
      .from("screening_criteria")
      .select("id,name,description,weight")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (criteriaErr || !criteria || criteria.length === 0) {
      return new Response(JSON.stringify({ error: "No active screening criteria found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare criteria text for AI
    const criteriaText = criteria.map((c) => `- ${c.name}: ${c.description} (weight: ${c.weight})`).join("\n");

    // Get exact criterion names for the prompt
    const criterionNames = criteria.map(c => c.name);

    // Build AI prompt for text-only analysis
    const promptText = `You are an expert venture capital analyst. Analyze this startup pitch deck and provide scores for each criterion.

# Startup Information
Company: ${deal.startup?.name || "N/A"}
Sector: ${deal.startup?.sector || "N/A"}
Description: ${deal.startup?.description || "N/A"}

Round: ${deal.round_type || "N/A"}
Target: $${deal.target_amount || "N/A"}
Valuation: $${deal.valuation || "N/A"}

Highlights: ${deal.highlights || "N/A"}
Risks: ${deal.risks || "N/A"}
Use of Funds: ${deal.use_of_funds || "N/A"}

# Screening Criteria
${criteriaText}

# Instructions
I've attached the pitch deck PDF. Please analyze it against EACH of the following criteria:
${criterionNames.map(name => `- ${name}`).join('\n')}

Provide:
1. A score from 1 to 5 for EACH criterion (1=poor, 5=excellent)
2. A detailed note (2-3 sentences) explaining your reasoning for each score

IMPORTANT: You MUST provide analysis for ALL ${criterionNames.length} criteria listed above. Use the exact criterion names in your response.

Format your response ONLY as valid JSON (no markdown code blocks) with this structure:
{
  "analyses": [
    {
      "criterion_name": "Market Opportunity",
      "score": 4,
      "note": "Large addressable market of $10B with 15% CAGR. Clear market trends support growth. Strong demand drivers evident in the pitch."
    }
  ],
  "overall_assessment": "Brief 2-3 sentence summary of the investment opportunity"
}`;

    // Call AI API (try Anthropic first, fallback to OpenAI)
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    let aiResponse;

    if (anthropicKey) {
      console.log("Using Anthropic API with key:", anthropicKey.substring(0, 10) + "...");
      console.log("PDF size:", pdfBase64.length, "characters");

      // Use Anthropic Claude with PDF support
      const requestBody = {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: promptText,
            },
          ],
        }],
      };

      console.log("Calling Anthropic API...");
      const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Anthropic response status:", anthropicResp.status);

      if (!anthropicResp.ok) {
        const errorBody = await anthropicResp.text();
        console.error("Anthropic API error:", anthropicResp.status, errorBody);
        throw new Error(`Anthropic API error: ${anthropicResp.statusText} - ${errorBody}`);
      }

      const anthropicData = await anthropicResp.json();
      console.log("Anthropic response received, content blocks:", anthropicData.content?.length);
      aiResponse = anthropicData.content[0].text;
    } else if (openaiKey) {
      // Use OpenAI
      const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo-preview",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });

      if (!openaiResp.ok) {
        throw new Error(`OpenAI API error: ${openaiResp.statusText}`);
      }

      const openaiData = await openaiResp.json();
      aiResponse = openaiData.choices[0].message.content;
    } else {
      return new Response(JSON.stringify({ error: "No AI API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse AI response
    console.log("Raw AI response:", aiResponse.substring(0, 500));

    // Extract JSON from response (Claude might wrap it in markdown)
    let jsonText = aiResponse;
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
      console.log("Extracted JSON from markdown code block");
    }

    let aiAnalysis;
    try {
      aiAnalysis = JSON.parse(jsonText);
      console.log("Successfully parsed AI response");
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("Response text:", jsonText);
      throw new Error("AI returned invalid JSON format");
    }

    // Map AI analyses to criteria IDs
    const scoredCriteria = criteria.map((c) => {
      // Try exact match first, then partial match
      let analysis = aiAnalysis.analyses?.find((a: any) =>
        a.criterion_name?.toLowerCase() === c.name.toLowerCase()
      );

      if (!analysis) {
        // Try partial match
        analysis = aiAnalysis.analyses?.find((a: any) =>
          a.criterion_name?.toLowerCase().includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(a.criterion_name?.toLowerCase())
        );
      }

      const result = {
        criterion_id: c.id,
        criterion_name: c.name,
        score: analysis?.score || 3,
        note: analysis?.note || "No specific analysis provided",
        weight: c.weight,
      };

      if (!analysis) {
        console.warn(`No AI analysis found for criterion: ${c.name}`);
      }

      return result;
    });

    console.log("Scored criteria count:", scoredCriteria.length);

    // Calculate weighted overall score
    const totalWeighted = scoredCriteria.reduce((sum, c) => sum + (c.score * c.weight), 0);
    const totalWeight = scoredCriteria.reduce((sum, c) => sum + c.weight, 0);
    const overallScore = totalWeight > 0 ? Math.round((totalWeighted / totalWeight) * 100) / 100 : 0;

    return new Response(JSON.stringify({
      ok: true,
      overall_score: overallScore,
      criteria_scores: scoredCriteria,
      overall_assessment: aiAnalysis.overall_assessment || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI screening error:", e);
    console.error("Error stack:", e?.stack);
    if (e instanceof Response) return e;

    const errorMessage = e?.message || String(e);
    console.error("Returning error to client:", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
