# Screening Criteria - AI Prompt Mapping

## The 7 Screening Criteria

These criteria are defined in the database and used by the AI to analyze pitch decks:

### 1. **Market Opportunity** (Weight: 1.5)
**Description**: Size and growth potential of target market
**AI Analyzes**:
- Total addressable market (TAM)
- Market growth rate and trends
- Market timing and readiness
- Demand drivers

### 2. **Team Quality** (Weight: 2.0) ⭐ HIGH WEIGHT
**Description**: Experience and execution capability of founding team
**AI Analyzes**:
- Founder backgrounds and expertise
- Track record of execution
- Domain knowledge
- Team completeness and gaps

### 3. **Product/Technology** (Weight: 1.5)
**Description**: Innovation and competitive advantage of solution
**AI Analyzes**:
- Technical innovation
- Product differentiation
- IP/moat strength
- Development stage

### 4. **Traction** (Weight: 2.0) ⭐ HIGH WEIGHT
**Description**: Customer adoption and revenue metrics
**AI Analyzes**:
- Revenue growth
- Customer metrics (CAC, LTV, churn)
- Product-market fit indicators
- Growth trajectory

### 5. **Business Model** (Weight: 1.0)
**Description**: Revenue model and unit economics viability
**AI Analyzes**:
- Revenue streams
- Pricing strategy
- Gross margins
- Path to profitability
- Scalability

### 6. **Competition** (Weight: 1.0)
**Description**: Competitive landscape and differentiation
**AI Analyzes**:
- Competitive positioning
- Barriers to entry
- Sustainable advantages
- Threat assessment

### 7. **Valuation** (Weight: 1.0)
**Description**: Deal terms and valuation reasonableness
**AI Analyzes**:
- Valuation vs. comparables
- Deal structure
- Terms fairness
- Risk/reward balance

## How AI Scoring Works

### Scoring Scale
- **5 = Excellent**: Outstanding, best-in-class
- **4 = Good**: Strong performance, above average
- **3 = Average**: Meets expectations, acceptable
- **2 = Below Average**: Concerns present, needs improvement
- **1 = Poor**: Significant issues, red flags

### Overall Score Calculation
```
Overall Score = Σ(Criterion Score × Weight) / Σ(Weights)
              = (score₁×1.5 + score₂×2.0 + ... + score₇×1.0) / 10.0
```

**Example**:
- Market Opportunity: 4 × 1.5 = 6.0
- Team Quality: 5 × 2.0 = 10.0
- Product/Technology: 3 × 1.5 = 4.5
- Traction: 4 × 2.0 = 8.0
- Business Model: 3 × 1.0 = 3.0
- Competition: 4 × 1.0 = 4.0
- Valuation: 3 × 1.0 = 3.0
**Total**: 38.5 / 10.0 = **3.85**

## AI Prompt Structure

The AI receives:

1. **Startup Context**:
   - Company name, sector, location
   - Round type, target amount, valuation
   - Highlights, risks, use of funds

2. **The Pitch Deck PDF**:
   - Full PDF with images, charts, formatting
   - Sent as base64 to Claude API

3. **Explicit Criteria List**:
   ```
   - Market Opportunity: Size and growth potential of target market (weight: 1.5)
   - Team Quality: Experience and execution capability of founding team (weight: 2.0)
   - Product/Technology: Innovation and competitive advantage of solution (weight: 1.5)
   - Traction: Customer adoption and revenue metrics (weight: 2.0)
   - Business Model: Revenue model and unit economics viability (weight: 1.0)
   - Competition: Competitive landscape and differentiation (weight: 1.0)
   - Valuation: Deal terms and valuation reasonableness (weight: 1.0)
   ```

4. **Strict Instructions**:
   - Score ALL 7 criteria (1-5)
   - Write 2-3 sentence notes for each
   - Use exact criterion names
   - Return valid JSON only

## Verification

### Check Criteria in Database
```sql
SELECT name, description, weight, is_active
FROM screening_criteria
WHERE is_active = true
ORDER BY created_at;
```

Should return exactly 7 rows matching the criteria above.

### Test Criteria Mapping
The edge function maps AI responses to database criteria by:
1. **Exact match**: criterion_name matches database name exactly
2. **Partial match**: criterion_name contains or is contained in database name
3. **Fallback**: Default score of 3 if no match found

## Frontend Display

In the deal page screening section, each criterion shows:
- **Slider**: Visual score selection (1-5)
- **Score number**: Current score value
- **Notes textarea**: AI-generated analysis (auto-populated)
- **Weight label**: Shows relative importance

Example:
```
┌─────────────────────────────────────────┐
│ Market Opportunity                      │
│ Size and growth potential of target ... │
│                                         │
│ [====●====                    ] 4  1.5x │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Large addressable market of $10B    │ │
│ │ with 15% CAGR. Clear market trends  │ │
│ │ support growth. Strong demand ...   │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Model Information

- **Model**: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- **Max Tokens**: 4,096 output tokens
- **API**: Anthropic Messages API with PDF support
- **Version**: anthropic-version: 2023-06-01
- **Benefits**: Fast, cost-effective, excellent PDF analysis

## Example AI Response

```json
{
  "analyses": [
    {
      "criterion_name": "Market Opportunity",
      "score": 4,
      "note": "Large addressable market of $10B with 15% CAGR. Clear market trends support growth. Strong demand drivers evident in the pitch."
    },
    {
      "criterion_name": "Team Quality",
      "score": 5,
      "note": "Exceptional founding team with prior exits and deep domain expertise. CEO previously scaled a similar company to $50M ARR. Complete C-level team in place."
    },
    {
      "criterion_name": "Product/Technology",
      "score": 3,
      "note": "Solid product with good user experience but limited technical moat. Differentiation relies more on execution than proprietary technology. Room for innovation."
    },
    {
      "criterion_name": "Traction",
      "score": 4,
      "note": "Strong revenue growth at $2M ARR with 15% MoM growth. Excellent unit economics with LTV/CAC of 5.2x. Over 100 paying customers with low churn."
    },
    {
      "criterion_name": "Business Model",
      "score": 3,
      "note": "SaaS subscription model is proven but pricing may need optimization. Gross margins of 70% are healthy. Path to profitability clear but will require scale."
    },
    {
      "criterion_name": "Competition",
      "score": 4,
      "note": "Competitive market but company has strong positioning in underserved niche. Key advantages in customer service and vertical integration. Some larger competitors present risk."
    },
    {
      "criterion_name": "Valuation",
      "score": 3,
      "note": "Valuation at $20M pre-money is reasonable for stage and traction, though at the higher end of comparable rounds. Terms are founder-friendly but acceptable for quality of opportunity."
    }
  ],
  "overall_assessment": "Strong investment opportunity driven by exceptional team and solid early traction. Market opportunity is substantial though competitive. Valuation is fair but not a bargain. Recommend proceed to full due diligence."
}
```

## Troubleshooting

### AI doesn't score all 7 criteria
**Check**: Are all 7 criteria active in the database?
```sql
SELECT COUNT(*) FROM screening_criteria WHERE is_active = true;
-- Should return 7
```

### Scores don't populate in UI
**Check**: Browser console for errors in criterion ID mapping
**Check**: Edge function logs for JSON parsing issues

### AI returns wrong criterion names
**Fallback**: Fuzzy matching will still work
**Check**: Logs will show "No AI analysis found for criterion: X"

### Model error
**Fix**: Verify model name is `claude-haiku-4-5-20251001`
**This is**: Latest Claude Haiku 4.5 model (October 2025 release)
