import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900">
      {/* Hero Section */}
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-32">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-xl px-5 py-2 text-sm text-white/90 border border-white/20">
            Built for Angel Networks • Powered by Modern Technology
          </div>

          <h1 className="mt-8 text-7xl font-semibold tracking-tight text-white">
            AngelOS
          </h1>

          <p className="mt-6 text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            The next-generation platform for angel investing and deal collaboration.
            Streamline your deal flow, empower your network, and make better investment decisions.
          </p>

          <div className="mt-12 flex items-center justify-center gap-4">
            <Link
              href="/auth?mode=signup"
              className="group relative overflow-hidden rounded-2xl bg-white px-8 py-4 text-base font-medium text-blue-700 shadow-2xl transition-all hover:shadow-white/20 hover:scale-105"
            >
              <span className="relative z-10">Sign Up</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              href="/auth"
              className="rounded-2xl bg-white/10 backdrop-blur-xl border-2 border-white/30 px-8 py-4 text-base font-medium text-white shadow-lg hover:bg-white/20 transition-all hover:scale-105"
            >
              Login
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gradient-to-b from-white via-blue-50 to-white py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-semibold text-blue-900 mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-xl text-blue-700/70 max-w-2xl mx-auto">
              Our investment platform brings together deal flow management, collaborative due diligence,
              and portfolio tracking in one seamless experience.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: "📊",
                title: "Deal Flow Management",
                description: "Streamline your startup application and screening process. Score deals against customizable criteria and track progress from submission to investment."
              },
              {
                icon: "🤝",
                title: "Collaborative Due Diligence",
                description: "Work together with your network. Share insights, vote on opportunities, and make informed decisions with complete transparency."
              },
              {
                icon: "💼",
                title: "Portfolio & Syndication",
                description: "Manage your portfolio with ease. Track investor interest, coordinate syndication, and monitor deal progress in real-time."
              },
              {
                icon: "🎯",
                title: "Investment Committee",
                description: "Structured IC workflow with member voting, confidence scoring, and chair decision-making. Full audit trail of all decisions."
              },
              {
                icon: "🌐",
                title: "Network Collaboration",
                description: "Connect with partner angel groups platform-wide. Share deals, co-invest, and access a broader network of opportunities."
              },
              {
                icon: "📈",
                title: "Analytics & Insights",
                description: "Data-driven decision making with comprehensive analytics. Track metrics, identify patterns, and optimize your investment strategy."
              }
            ].map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2 border border-blue-100"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="text-5xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-blue-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-blue-700/70 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-semibold text-white mb-4">
              Built for angel networks
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Designed with network operators and members in mind, making deal sharing,
              pipeline management, and investor communication more efficient.
            </p>
          </div>

          <div className="grid gap-12 md:grid-cols-2">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center text-2xl border border-white/20">
                  ⚡
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    For Network Operators
                  </h3>
                  <p className="text-white/70 leading-relaxed">
                    Save time and boost productivity. The platform streamlines your entire workflow—from
                    deal intake to final investment. Improved information flow and automated processes
                    mean you can focus on what matters: finding great deals.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center text-2xl border border-white/20">
                  👥
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    For Angel Investors
                  </h3>
                  <p className="text-white/70 leading-relaxed">
                    A clean, intuitive interface that even experienced members find valuable. Access detailed
                    deal information, collaborate with peers, and make confident investment decisions with
                    comprehensive screening data at your fingertips.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center text-2xl border border-white/20">
                  🚀
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    For Startups
                  </h3>
                  <p className="text-white/70 leading-relaxed">
                    Submit your deal once and get exposure to an entire network of investors. Professional
                    presentation, structured feedback, and transparent process help you connect with the
                    right capital at the right time.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="sticky top-8 rounded-3xl bg-white/10 backdrop-blur-xl p-8 border border-white/20">
                <h3 className="text-3xl font-semibold text-white mb-6">
                  The platform difference
                </h3>
                <ul className="space-y-4">
                  {[
                    "Structured deal flow from submission to investment",
                    "AI-powered screening and analysis",
                    "Collaborative due diligence tools",
                    "IC voting with confidence scoring",
                    "Portfolio tracking and analytics",
                    "Network-wide deal sharing",
                    "Real-time investor interest tracking",
                    "Comprehensive audit trails"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-sm">
                        ✓
                      </span>
                      <span className="text-white/90">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Section */}
      <div className="bg-gradient-to-b from-white via-blue-50 to-white py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-semibold text-blue-900 mb-4">
              Seamless workflow
            </h2>
            <p className="text-xl text-blue-700/70 max-w-2xl mx-auto">
              From deal submission to investment, every step is optimized for efficiency and transparency.
            </p>
          </div>

          <div className="relative">
            {/* Workflow Steps */}
            <div className="grid gap-8 md:grid-cols-4">
              {[
                {
                  step: "01",
                  title: "Submit",
                  description: "Founders submit deals with comprehensive information and pitch decks"
                },
                {
                  step: "02",
                  title: "Screen",
                  description: "Dealflow managers score against criteria with AI-powered analysis"
                },
                {
                  step: "03",
                  title: "Decide",
                  description: "IC members vote, chair makes final recommendation"
                },
                {
                  step: "04",
                  title: "Invest",
                  description: "Published deals visible to investors for syndication"
                }
              ].map((item, index) => (
                <div key={item.step} className="relative">
                  <div className="relative rounded-3xl bg-white p-8 shadow-lg border border-blue-100">
                    <div className="text-6xl font-bold text-blue-100 mb-4">{item.step}</div>
                    <h3 className="text-2xl font-semibold text-blue-900 mb-3">{item.title}</h3>
                    <p className="text-blue-700/70 leading-relaxed">{item.description}</p>
                  </div>
                  {index < 3 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 py-32">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-5xl font-semibold text-white mb-6">
            Ready to transform your angel network?
          </h2>
          <p className="text-xl text-white/70 mb-12 max-w-2xl mx-auto">
            Join leading angel networks using our investment platform to streamline deal flow,
            enhance collaboration, and make better investment decisions.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/auth?mode=signup"
              className="rounded-2xl bg-white px-10 py-5 text-lg font-medium text-blue-700 shadow-2xl hover:shadow-white/20 transition-all hover:scale-105"
            >
              Sign Up
            </Link>
            <Link
              href="/auth"
              className="rounded-2xl bg-white/10 backdrop-blur-xl border-2 border-white/30 px-10 py-5 text-lg font-medium text-white hover:bg-white/20 transition-all hover:scale-105"
            >
              Login
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-blue-950 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-white/60 text-sm">
              © 2025 AngelOS. Built for angel networks worldwide.
            </div>
            <div className="flex gap-6">
              <Link href="/auth?mode=signup" className="text-white/60 hover:text-white text-sm transition">
                Sign Up
              </Link>
              <Link href="/auth" className="text-white/60 hover:text-white text-sm transition">
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
