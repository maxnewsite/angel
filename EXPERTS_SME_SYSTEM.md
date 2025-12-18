# Expert Network & SME Portfolio System

Complete subject matter expert (SME) management system for deal evaluation and advisory services.

## Overview

The Expert Network system provides a centralized portfolio of subject matter experts who can be consulted during deal evaluation. Internal roles (dealflow managers, IC members, IC chairs, and admins) can browse experts by domain, seniority, and availability, then request consultations for specific deals.

## Features Implemented

### 1. Database Schema
**File**: `supabase/migrations/010_experts_sme.sql`

#### Tables Created:

**expertise_domains** - Reference data for expert categorization
- Technology domains (AI, SaaS, Fintech, Cybersecurity, etc.)
- Industry domains (E-commerce, Healthcare, Real Estate, etc.)
- Functional expertise (Product, Go-to-Market, Operations, etc.)
- Pre-seeded with 24 common domains

**experts** - SME profiles
- Basic information (name, email, phone, LinkedIn, location)
- Professional profile (title, company, bio, years of experience)
- Expertise classification (seniority, domains, industries, skills)
- Availability & engagement (status, rates, preferred engagement types)
- Metrics & performance (deals consulted, ratings, response time)
- Administrative fields

**expert_consultations** - Consultation tracking
- Links experts to deals
- Tracks consultation status (requested → accepted → in_progress → completed)
- Stores expert recommendations and notes
- Captures ratings and feedback
- Unique constraint: one active consultation per expert per deal

#### Seniority Levels:
- **Junior**: Early career professionals
- **Mid**: Mid-level experts
- **Senior**: Senior-level experts with deep domain knowledge
- **Principal**: Principal/Staff level with cross-domain expertise
- **Executive**: C-level executives and industry leaders

#### Availability Statuses:
- **Available**: Ready for new consultations
- **Limited**: Available but with reduced capacity
- **Busy**: Currently engaged, minimal availability
- **Unavailable**: Not accepting new consultations

### 2. UI Components
**File**: `app/app/experts/page.tsx`

#### Features:
- **Stats Dashboard**: Total experts, available now, domains, consultations
- **Multi-filter Search**:
  - Free text search (name, title, company, bio)
  - Filter by expertise domain
  - Filter by seniority level
  - Filter by availability status
- **Expert Cards**: Rich profile cards with:
  - Name, title, company
  - Primary expertise domain
  - Seniority and years of experience
  - Star ratings and review count
  - Deals consulted count
  - Bio preview
  - Expandable details (industries, skills, engagement types, rates)
  - Direct contact actions (email, LinkedIn)
- **Add Expert Modal** (Admin only): Comprehensive form for adding new experts

### 3. Navigation
**File**: `components/AppShell.tsx`

Added "Experts" link to navigation menu for internal roles:
- Dealflow Managers
- IC Members
- IC Chairs
- Admins

## Installation Steps

### Step 1: Apply Database Migration

Go to **Supabase Dashboard → SQL Editor** and execute the complete SQL script from:
`supabase/migrations/010_experts_sme.sql`

This will:
1. Create the `expertise_domains` table
2. Seed 24 common expertise domains
3. Create the `experts` table with all fields
4. Create the `expert_consultations` table
5. Set up RLS policies
6. Create indexes for performance
7. Insert 3 sample experts (for demo/testing)
8. Create helper functions and triggers

### Step 2: Test the Feature

1. Log in as a dealflow manager, IC member, IC chair, or admin
2. Navigate to the "Experts" link in the header
3. Browse the expert portfolio
4. Use filters to find experts by domain, seniority, or availability
5. Click "View Details" to see full expert profiles
6. (Admin only) Click "Add Expert" to create new expert profiles

## Database Schema Details

### expertise_domains Table
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL UNIQUE
description TEXT
category TEXT -- "Technology", "Industry", "Functional"
is_active BOOLEAN DEFAULT true
created_at TIMESTAMPTZ
```

**Pre-seeded Domains** (24 total):

**Technology** (8):
- Artificial Intelligence
- SaaS & Cloud
- Fintech
- Healthcare Tech
- Blockchain & Crypto
- Cybersecurity
- IoT & Hardware
- Mobile & Apps

**Industry** (8):
- E-commerce
- Education
- Real Estate
- Energy & Climate
- Manufacturing
- Agriculture
- Logistics
- Media & Entertainment

**Functional** (8):
- Product Management
- Go-to-Market
- Operations
- Finance & Accounting
- Legal & Compliance
- Talent & HR
- Data Science
- UX & Design

### experts Table
```sql
id UUID PRIMARY KEY

-- Basic Information
full_name TEXT NOT NULL
email TEXT
phone TEXT
linkedin_url TEXT
location TEXT

-- Professional Profile
title TEXT
company TEXT
bio TEXT
years_of_experience INTEGER

-- Expertise Classification
seniority TEXT -- junior|mid|senior|principal|executive
primary_domain_id UUID REFERENCES expertise_domains
expertise_domain_ids UUID[] -- Array of domain IDs
industries TEXT[] -- Array of industries
technical_skills TEXT[] -- Array of skills

-- Availability & Engagement
availability_status TEXT -- available|limited|busy|unavailable
hourly_rate NUMERIC
preferred_engagement_types TEXT[] -- e.g., advisory, due_diligence
max_monthly_engagements INTEGER DEFAULT 3

-- Metrics & Performance
deals_consulted INTEGER DEFAULT 0
average_response_time_hours INTEGER
rating_average NUMERIC(3,2) -- 1.00 to 5.00
total_ratings INTEGER DEFAULT 0

-- Administrative
is_active BOOLEAN DEFAULT true
notes TEXT
added_by_user_id UUID REFERENCES profiles
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### expert_consultations Table
```sql
id UUID PRIMARY KEY
deal_id UUID REFERENCES deals
expert_id UUID REFERENCES experts

-- Consultation Details
requested_by_user_id UUID REFERENCES profiles
consultation_type TEXT
consultation_areas TEXT[]

-- Status Tracking
status TEXT -- requested|accepted|in_progress|completed|declined
priority TEXT -- low|normal|high|urgent

-- Scheduling
requested_at TIMESTAMPTZ
scheduled_for TIMESTAMPTZ
completed_at TIMESTAMPTZ

-- Deliverables
notes TEXT
recommendation TEXT
confidence_level INTEGER (1-5)
supporting_documents JSONB

-- Feedback
rating INTEGER (1-5)
feedback TEXT

created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ

UNIQUE(deal_id, expert_id)
```

## Sample Experts

The migration includes 3 sample experts for testing:

### 1. Dr. Sarah Chen
- **Seniority**: Executive
- **Domain**: Artificial Intelligence
- **Title**: Former Director of AI Research at Meta
- **Bio**: PhD in Computer Science with 15 years of experience in AI/ML. Led research teams at Meta and Google.
- **Skills**: Python, TensorFlow, PyTorch, MLOps, Kubernetes
- **Rate**: $500/hour
- **Availability**: Available
- **Rating**: 4.8/5.0 (12 consultations)

### 2. Michael Rodriguez
- **Seniority**: Executive
- **Domain**: Product Management
- **Title**: VP of Product at Stripe
- **Bio**: Built and scaled product organizations from 0 to IPO. Product leader at Stripe, previously at Square and PayPal.
- **Industries**: Fintech, Payments, B2B SaaS
- **Skills**: Product Strategy, API Design, Platform Development
- **Rate**: $750/hour
- **Availability**: Limited
- **Rating**: 4.9/5.0 (8 consultations)

### 3. Jennifer Wu
- **Seniority**: Senior
- **Domain**: Go-to-Market
- **Title**: Former CMO at HubSpot
- **Bio**: Built go-to-market engines for multiple B2B SaaS companies. Led marketing at HubSpot through $1B ARR.
- **Industries**: B2B SaaS, Marketing Tech
- **Skills**: Growth Marketing, PLG, Content Strategy, SEO
- **Rate**: $400/hour
- **Availability**: Available
- **Rating**: 4.7/5.0 (15 consultations)

## User Workflows

### For Dealflow Managers & IC Members

**Browse Experts**:
1. Navigate to "Experts" section
2. View stats dashboard (total experts, available now, etc.)
3. Use filters to find relevant experts:
   - Search by name, title, company
   - Filter by expertise domain
   - Filter by seniority level
   - Filter by availability
4. Click "View Details" for full profile
5. Contact expert via email or LinkedIn

**Request Consultation** (Future Phase):
1. Navigate to deal detail page
2. Click "Request Expert Consultation"
3. Select expert from filtered list
4. Specify consultation type and focus areas
5. Set priority level
6. Submit request
7. Track consultation status
8. Receive expert recommendation

### For Admins

**Add New Expert**:
1. Navigate to "Experts" section
2. Click "Add Expert" button
3. Fill in comprehensive form:
   - Basic info (name, email, phone, LinkedIn)
   - Professional profile (title, company, bio, experience)
   - Expertise (domain, seniority, industries, skills)
   - Availability and rates
   - Engagement preferences
4. Submit to create expert profile
5. Expert appears in searchable portfolio

**Manage Experts**:
- View all experts in the network
- Filter and search to find specific experts
- Update expert profiles (future: edit functionality)
- Deactivate experts (set `is_active = false`)
- Track expert performance metrics

## Advanced Features

### Helper Functions

**update_expert_metrics()** - Trigger function
- Automatically updates expert metrics when consultations complete
- Increments `deals_consulted` counter
- Calculates rolling average rating
- Updates `total_ratings` count

**get_available_experts_by_domain(domain_name)** - Query function
Returns available experts for a specific domain:
```sql
SELECT * FROM get_available_experts_by_domain('Artificial Intelligence');
```

Returns:
- Expert ID, name, title
- Seniority and availability
- Rating and deals count
- Ordered by rating and experience

### Performance Optimizations

**Indexes Created**:
- `idx_experts_seniority` - Fast seniority filtering
- `idx_experts_availability` - Fast availability filtering
- `idx_experts_active` - Fast active/inactive filtering
- `idx_experts_primary_domain` - Fast domain filtering
- `idx_expert_consultations_deal` - Fast deal consultation lookup
- `idx_expert_consultations_expert` - Fast expert consultation history
- `idx_expert_consultations_status` - Fast status filtering

### RLS Policies

**expertise_domains**:
- Internal roles can view all domains

**experts**:
- Internal roles can view all experts
- Admins can create/update/delete experts

**expert_consultations**:
- Internal roles can view all consultations
- Internal roles can request consultations
- Internal roles can update consultation status

## Integration with Deal Evaluation

### Current Integration
- Experts visible to all internal roles
- Portfolio accessible from main navigation
- Filter and search functionality
- Direct contact via email/LinkedIn

### Future Integration (Phase 2)

**Deal Detail Page**:
- "Request Expert Consultation" button
- Shows relevant experts based on deal domain
- Quick consultation request flow
- Consultation status tracking

**IC Review**:
- Display expert consultations on deal
- Show expert recommendations
- Include expert confidence ratings
- Factor into IC decision-making

**Expert Dashboard**:
- Expert-facing portal (future)
- View assigned consultations
- Submit recommendations
- Track consultation history

## API Usage Examples

### Query Available AI Experts
```sql
SELECT * FROM get_available_experts_by_domain('Artificial Intelligence')
WHERE rating_average >= 4.5
LIMIT 5;
```

### Create Expert Consultation
```sql
INSERT INTO expert_consultations (
  deal_id,
  expert_id,
  requested_by_user_id,
  consultation_type,
  consultation_areas,
  status,
  priority
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  '223e4567-e89b-12d3-a456-426614174001',
  auth.uid(),
  'technical_review',
  ARRAY['AI Architecture', 'Scalability'],
  'requested',
  'high'
);
```

### Update Expert Rating After Consultation
```sql
UPDATE expert_consultations
SET
  status = 'completed',
  completed_at = NOW(),
  rating = 5,
  feedback = 'Excellent technical analysis, very helpful insights'
WHERE id = 'consultation_id';

-- Trigger automatically updates expert metrics
```

### Find Experts by Multiple Domains
```sql
SELECT DISTINCT e.*
FROM experts e
WHERE e.expertise_domain_ids && ARRAY(
  SELECT id FROM expertise_domains
  WHERE name IN ('Artificial Intelligence', 'SaaS & Cloud')
)
AND e.availability_status = 'available'
ORDER BY e.rating_average DESC NULLS LAST;
```

## Future Enhancements

### Phase 2: Consultation Workflow
- Request expert consultation from deal page
- Email notifications to experts
- Expert acceptance/decline workflow
- Scheduled consultation management
- Expert recommendation submission
- Rating and feedback system

### Phase 3: Expert Portal
- Expert-facing authentication
- Personal dashboard
- Consultation queue
- Recommendation templates
- Performance analytics
- Payment/invoicing integration

### Phase 4: Advanced Features
- AI-powered expert matching
- Automated consultation scheduling
- Video consultation integration
- Expert report generation
- Collaborative due diligence
- Expert community features

### Phase 5: Analytics & Insights
- Expert performance dashboards
- Consultation outcome tracking
- ROI analysis per expert
- Domain coverage analysis
- Expert network health metrics
- Predictive expert recommendations

## Troubleshooting

### Experts Not Showing
**Cause**: RLS policies not applied or user not internal role
**Solution**:
- Verify user has internal role (admin, dealflow_manager, ic_member, ic_chair)
- Check RLS policies are enabled: `SELECT * FROM pg_policies WHERE tablename = 'experts';`

### Cannot Add Expert (Admin)
**Cause**: Missing required fields or RLS permission issue
**Solution**:
- Ensure user has admin role
- Fill in all required fields (full_name, seniority)
- Check browser console for specific error

### Filters Not Working
**Cause**: Frontend state management or data type mismatch
**Solution**:
- Check browser console for errors
- Verify domain IDs match between tables
- Ensure seniority values match constraint

### Sample Experts Not Appearing
**Cause**: Migration not fully executed or domain IDs not found
**Solution**:
- Re-run the full migration script
- Verify expertise_domains table has entries
- Check experts table for sample data

## Testing Checklist

- [x] Database migration runs successfully
- [x] Sample experts inserted
- [x] Expertise domains seeded
- [ ] Experts page loads for internal roles
- [ ] Filters work correctly (domain, seniority, availability, search)
- [ ] Expert cards display all information
- [ ] "View Details" expands correctly
- [ ] Email and LinkedIn links work
- [ ] Add Expert modal opens (admin only)
- [ ] New expert creation works
- [ ] Navigation link appears for internal roles only
- [ ] Stats cards show correct counts
- [ ] Expert metrics update on consultation completion

## Security Considerations

### RLS Policies
- ✅ Only internal roles can view experts
- ✅ Only admins can create/update experts
- ✅ Expert consultations protected by RLS
- ✅ Expertise domains read-only for non-admins

### Data Privacy
- Expert contact information visible only to internal roles
- Expert notes (internal) not exposed to external users
- Consultation details restricted to deal participants
- Rating and feedback tied to authenticated users

### Input Validation
- Email format validation on frontend
- Phone number optional
- URL validation for LinkedIn
- Hourly rate must be positive number
- Arrays properly sanitized (industries, skills)

## Support

For questions or issues:
1. Check Supabase logs for RLS errors
2. Verify user role in profiles table
3. Ensure migration was applied completely
4. Check browser console for frontend errors
5. Test with sample experts first

## Files Reference

### Database
- `supabase/migrations/010_experts_sme.sql` - Complete schema and seed data

### Frontend
- `app/app/experts/page.tsx` - Experts portfolio page
- `components/AppShell.tsx` - Navigation (Experts link added)

### Documentation
- `EXPERTS_SME_SYSTEM.md` - This file
