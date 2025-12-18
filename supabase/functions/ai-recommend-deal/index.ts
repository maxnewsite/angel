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

    // Fetch comprehensive deal data
    const { data: deal, error: dealErr } = await adminClient
      .from("deals")
      .select(`
        id,
        status,
        startup:startup_id(name,sector,hq_location,description,team_summary,traction_summary),
        round_type,
        target_amount,
        min_ticket,
        valuation,
        instrument,
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

    // Fetch dealflow manager screening scores
    const { data: scores } = await adminClient
      .from("screening_scores")
      .select(`
        score,
        note,
        criterion:criterion_id(name,description,weight)
      `)
      .eq("deal_id", dealId);

    // Fetch dealflow manager screening review
    const { data: review } = await adminClient
      .from("screening_reviews")
      .select("overall_score,decision,summary_memo")
      .eq("deal_id", dealId)
      .maybeSingle();

    // Fetch dealflow manager flags
    const { data: flags } = await adminClient
      .from("deal_flags")
      .select("green_flags,red_flags")
      .eq("deal_id", dealId)
      .maybeSingle();

    // Fetch ALL analyst screening reviews
    const { data: analystReviews } = await adminClient
      .from("analyst_screening_reviews")
      .select(`
        overall_score,
        decision,
        summary_memo,
        analyst_user_id,
        analyst:analyst_user_id(full_name,email)
      `)
      .eq("deal_id", dealId);

    // Fetch ALL analyst screening scores
    const { data: analystScores } = await adminClient
      .from("analyst_screening_scores")
      .select(`
        score,
        note,
        analyst_user_id,
        criterion:criterion_id(name,description,weight)
      `)
      .eq("deal_id", dealId);

    // Fetch ALL analyst flags
    const { data: analystFlags } = await adminClient
      .from("analyst_deal_flags")
      .select("green_flags,red_flags,analyst_user_id")
      .eq("deal_id", dealId);

    // Build comprehensive analysis prompt with BOTH manager and analyst data
    const analysisPrompt = buildAnalysisPrompt(
      deal,
      scores || [],
      review,
      flags,
      analystReviews || [],
      analystScores || [],
      analystFlags || []
    );

    // Call Claude API for recommendation
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: analysisPrompt,
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", errorText);
      throw new Error(`Claude API failed: ${response.status}`);
    }

    const result = await response.json();
    const aiResponse = result.content[0].text;

    // Parse the AI response to extract score and analysis
    const recommendation = parseRecommendation(aiResponse);

    // Store recommendation in database
    const { error: insertErr } = await adminClient
      .from("ai_recommendations")
      .upsert({
        deal_id: dealId,
        score: recommendation.score,
        recommendation_text: recommendation.recommendation,
        rationale: recommendation.rationale,
        analysis_data: {
          manager_screening_scores: scores,
          manager_flags: flags,
          manager_review: review,
          analyst_reviews: analystReviews,
          analyst_scores: analystScores,
          analyst_flags: analystFlags,
          ai_full_response: aiResponse,
        },
        generated_by_user_id: user.id,
        created_at: new Date().toISOString(),
      }, {
        onConflict: "deal_id",
      });

    if (insertErr) {
      console.error("Failed to store recommendation:", insertErr);
      throw insertErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        score: recommendation.score,
        recommendation: recommendation.recommendation,
        rationale: recommendation.rationale,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("AI recommendation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildAnalysisPrompt(
  deal: any,
  scores: any[],
  review: any,
  flags: any,
  analystReviews: any[],
  analystScores: any[],
  analystFlags: any[]
): string {
  const startup = deal.startup || {};

  let prompt = `You are an expert venture capital analyst. Analyze the following startup investment opportunity and provide a comprehensive recommendation score from 0-100.

**STARTUP INFORMATION:**
- Name: ${startup.name || "N/A"}
- Sector: ${startup.sector || "N/A"}
- Location: ${startup.hq_location || "N/A"}
- Description: ${startup.description || "N/A"}
- Team: ${startup.team_summary || "N/A"}
- Traction: ${startup.traction_summary || "N/A"}

**DEAL TERMS:**
- Round Type: ${deal.round_type || "N/A"}
- Target Amount: $${deal.target_amount?.toLocaleString() || "N/A"}
- Valuation: $${deal.valuation?.toLocaleString() || "N/A"}
- Minimum Ticket: $${deal.min_ticket?.toLocaleString() || "N/A"}
- Instrument: ${deal.instrument || "N/A"}

**DEAL HIGHLIGHTS:**
${deal.highlights || "None provided"}

**IDENTIFIED RISKS:**
${deal.risks || "None provided"}

**USE OF FUNDS:**
${deal.use_of_funds || "None provided"}

**DEALFLOW MANAGER SCREENING ANALYSIS:**`;

  if (scores && scores.length > 0) {
    prompt += `\n\nManager's Detailed Criteria Scores (1-5 scale):`;
    scores.forEach((s: any) => {
      prompt += `\n- ${s.criterion?.name || "Unknown"} (Weight: ${s.criterion?.weight || 1}): ${s.score}/5`;
      if (s.note) {
        prompt += `\n  Analysis: ${s.note}`;
      }
    });
  }

  if (review) {
    prompt += `\n\nManager's Overall Screening Score: ${review.overall_score || "N/A"}/5`;
    prompt += `\nManager's Screening Decision: ${review.decision || "N/A"}`;
    if (review.summary_memo) {
      prompt += `\nManager's Executive Summary: ${review.summary_memo}`;
    }
  }

  if (flags?.green_flags && flags.green_flags.length > 0) {
    prompt += `\n\n**MANAGER'S GREEN FLAGS (${flags.green_flags.length}):**`;
    flags.green_flags.forEach((f: any, i: number) => {
      prompt += `\n${i + 1}. ${f.flag}`;
      if (f.note) prompt += ` - ${f.note}`;
    });
  }

  if (flags?.red_flags && flags.red_flags.length > 0) {
    prompt += `\n\n**MANAGER'S RED FLAGS (${flags.red_flags.length}):**`;
    flags.red_flags.forEach((f: any, i: number) => {
      prompt += `\n${i + 1}. ${f.flag}`;
      if (f.note) prompt += ` - ${f.note}`;
    });
  }

  // Add analyst analyses
  if (analystReviews && analystReviews.length > 0) {
    prompt += `\n\n**DEALFLOW ANALYST SCREENING ANALYSES (${analystReviews.length} analysts):**`;

    analystReviews.forEach((analystReview: any, idx: number) => {
      const analystName = analystReview.analyst?.full_name || analystReview.analyst?.email || `Analyst ${idx + 1}`;
      const analystId = analystReview.analyst_user_id;

      prompt += `\n\n--- ANALYST ${idx + 1}: ${analystName} ---`;
      prompt += `\nOverall Score: ${analystReview.overall_score || "N/A"}/5`;
      prompt += `\nDecision: ${analystReview.decision || "N/A"}`;

      if (analystReview.summary_memo) {
        prompt += `\nExecutive Summary: ${analystReview.summary_memo}`;
      }

      // Add this analyst's detailed scores
      const thisAnalystScores = analystScores?.filter((s: any) => s.analyst_user_id === analystId);
      if (thisAnalystScores && thisAnalystScores.length > 0) {
        prompt += `\n\nDetailed Criteria Scores:`;
        thisAnalystScores.forEach((s: any) => {
          prompt += `\n- ${s.criterion?.name || "Unknown"} (Weight: ${s.criterion?.weight || 1}): ${s.score}/5`;
          if (s.note) {
            prompt += `\n  Analysis: ${s.note}`;
          }
        });
      }

      // Add this analyst's flags
      const thisAnalystFlags = analystFlags?.find((f: any) => f.analyst_user_id === analystId);
      if (thisAnalystFlags?.green_flags && thisAnalystFlags.green_flags.length > 0) {
        prompt += `\n\nGreen Flags (${thisAnalystFlags.green_flags.length}):`;
        thisAnalystFlags.green_flags.forEach((f: any, i: number) => {
          prompt += `\n${i + 1}. ${f.flag}`;
          if (f.note) prompt += ` - ${f.note}`;
        });
      }

      if (thisAnalystFlags?.red_flags && thisAnalystFlags.red_flags.length > 0) {
        prompt += `\n\nRed Flags (${thisAnalystFlags.red_flags.length}):`;
        thisAnalystFlags.red_flags.forEach((f: any, i: number) => {
          prompt += `\n${i + 1}. ${f.flag}`;
          if (f.note) prompt += ` - ${f.note}`;
        });
      }
    });
  }

  prompt += `

**YOUR TASK:**
Based on ALL the information above (startup profile, deal terms, dealflow manager's analysis, AND all dealflow analyst analyses), provide a comprehensive synthesis that considers multiple perspectives:

1. A RECOMMENDATION SCORE from 0-100 where:
   - 0-39: Strong Reject (critical issues, not investment-ready)
   - 40-59: Reject or Request More Information (significant concerns)
   - 60-79: Deep Dive Required (promising but needs validation/SME advice)
   - 80-100: Recommend to IC (strong opportunity, ready for investment committee)

2. A ONE-SENTENCE RECOMMENDATION stating the action (Recommend to IC, Deep Dive, Request More Info, or Reject)

3. A DETAILED RATIONALE (200-300 words) explaining:
   - Key strengths that support the score (synthesizing manager and analyst views)
   - Main concerns or risks identified (noting consensus or divergent opinions)
   - Critical factors that influenced the score (weighing multiple perspectives)
   - Areas of agreement vs. disagreement among analysts and manager
   - What would need to change to improve the score

**FORMAT YOUR RESPONSE EXACTLY AS:**
SCORE: [number 0-100]
RECOMMENDATION: [one sentence recommendation]
RATIONALE: [detailed explanation]

Be precise, data-driven, and honest in your assessment. Synthesize insights from ALL sources (manager + analysts) to provide a balanced, multi-perspective recommendation. If analysts disagree with each other or with the manager, note this and explain how you weighted different viewpoints. This recommendation will guide significant investment decisions.`;

  return prompt;
}

function parseRecommendation(aiResponse: string): { score: number; recommendation: string; rationale: string } {
  // Extract score
  const scoreMatch = aiResponse.match(/SCORE:\s*(\d+)/i);
  const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : 50;

  // Extract recommendation
  const recMatch = aiResponse.match(/RECOMMENDATION:\s*(.+?)(?=\n\n|RATIONALE:|$)/is);
  const recommendation = recMatch ? recMatch[1].trim() : getDefaultRecommendation(score);

  // Extract rationale
  const ratMatch = aiResponse.match(/RATIONALE:\s*(.+)/is);
  const rationale = ratMatch ? ratMatch[1].trim() : aiResponse;

  return { score, recommendation, rationale };
}

function getDefaultRecommendation(score: number): string {
  if (score >= 80) return "Recommend to Investment Committee - Strong opportunity";
  if (score >= 60) return "Deep dive required - Request SME advice before proceeding";
  if (score >= 40) return "Request more information or reject - Significant concerns identified";
  return "Reject - Not suitable for investment at this time";
}
