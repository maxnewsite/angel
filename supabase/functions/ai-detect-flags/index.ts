import { corsHeaders, maybeHandleCors } from "../_shared/cors.ts";
import { adminClient, requireRole } from "../_shared/supabase.ts";

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

    // Fetch deal details with startup info
    const { data: deal, error: dealErr } = await adminClient
      .from("deals")
      .select(`
        id,
        startup:startup_id(name,sector,description,team_summary,traction_summary),
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

    // Fetch pitch deck (optional for flag detection)
    const { data: docs } = await adminClient
      .from("documents")
      .select("storage_path,file_name")
      .eq("deal_id", dealId)
      .eq("visibility", "internal")
      .order("created_at", { ascending: false })
      .limit(1);

    let pdfBase64 = null;
    if (docs && docs.length > 0) {
      const { data: pdfData } = await adminClient.storage
        .from("deal-docs")
        .download(docs[0].storage_path);

      if (pdfData) {
        const pdfBuffer = await pdfData.arrayBuffer();
        const bytes = new Uint8Array(pdfBuffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        pdfBase64 = btoa(binary);
      }
    }

    // Build AI prompt for flag detection
    const prompt = `You are an expert venture capital analyst trained on Y Combinator's investment criteria. Analyze this startup and identify key red flags (warnings/concerns) and green flags (positive indicators) that would be relevant for an investment committee.

# Startup Information
Company: ${deal.startup?.name || "N/A"}
Sector: ${deal.startup?.sector || "N/A"}
Description: ${deal.startup?.description || "N/A"}
Team: ${deal.startup?.team_summary || "N/A"}
Traction: ${deal.startup?.traction_summary || "N/A"}

Round: ${deal.round_type || "N/A"}
Target: $${deal.target_amount || "N/A"}
Valuation: $${deal.valuation || "N/A"}

Highlights: ${deal.highlights || "N/A"}
Risks: ${deal.risks || "N/A"}
Use of Funds: ${deal.use_of_funds || "N/A"}

# Instructions
${pdfBase64 ? "I've attached the pitch deck PDF. Use it for additional context." : "Analyze based on the information provided above."}

Identify:
1. **Green Flags** (3-5 flags): Positive indicators that make this a strong investment opportunity
   - Examples: Exceptional team, strong PMF, impressive growth, large market, defensibility

2. **Red Flags** (3-5 flags): Warning signs or concerns that need attention
   - Examples: Weak team, no traction, small market, no moat, unfavorable terms

For each flag, provide:
- A concise flag description (1 sentence)
- Supporting evidence/note (1-2 sentences)

Format your response ONLY as valid JSON (no markdown) with this structure:
{
  "green_flags": [
    {
      "flag": "Exceptional founding team",
      "note": "Founders have 2 prior exits and 10+ years domain expertise. Strong technical capability with engineers from Google/Meta."
    }
  ],
  "red_flags": [
    {
      "flag": "Limited traction",
      "note": "Only 10 users after 6 months in market. MoM growth is flat. No clear product-market fit indicators."
    }
  ]
}`;

    // Call Anthropic API
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "No AI API key configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Detecting flags with AI...");
    const requestBody: any = {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: pdfBase64
          ? [
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
                text: prompt,
              },
            ]
          : [
              {
                type: "text",
                text: prompt,
              },
            ]
      }],
    };

    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    });

    if (!anthropicResp.ok) {
      const errorBody = await anthropicResp.text();
      console.error("Anthropic API error:", anthropicResp.status, errorBody);
      throw new Error(`Anthropic API error: ${anthropicResp.statusText}`);
    }

    const anthropicData = await anthropicResp.json();
    const aiResponse = anthropicData.content[0].text;

    console.log("AI response received:", aiResponse.substring(0, 200));

    // Parse JSON response
    let jsonText = aiResponse;
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    let flags;
    try {
      flags = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("AI returned invalid JSON format");
    }

    return new Response(JSON.stringify({
      ok: true,
      green_flags: flags.green_flags || [],
      red_flags: flags.red_flags || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("AI flag detection error:", e);
    const errorMessage = e?.message || String(e);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
