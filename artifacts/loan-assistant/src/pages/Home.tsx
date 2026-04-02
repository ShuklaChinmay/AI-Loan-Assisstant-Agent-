import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Bot, ShieldCheck, Zap, TrendingUp, Home, Car, GraduationCap, Briefcase, Building2, Gem } from "lucide-react";
import { useListLoans } from "@workspace/api-client-react";

const loanTypeIcons = {
  home: Home,
  personal: Building2,
  business: Briefcase,
  education: GraduationCap,
  vehicle: Car,
  gold: Gem,
};

const loanTypeColors = {
  home: "from-blue-500/20 to-blue-600/5",
  personal: "from-violet-500/20 to-violet-600/5",
  business: "from-amber-500/20 to-amber-600/5",
  education: "from-green-500/20 to-green-600/5",
  vehicle: "from-orange-500/20 to-orange-600/5",
  gold: "from-yellow-500/20 to-yellow-600/5",
};

export default function HomePage() {
  const { data: loans } = useListLoans();

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-sidebar py-20 md:py-32 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-xs font-medium border border-primary/20 bg-primary/10 text-primary">
            Powered by Agentic AI
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-sidebar-foreground mb-6 leading-tight">
            Smart Loans,<br />
            <span className="text-primary">Guided by AI</span>
          </h1>
          <p className="text-sidebar-foreground/70 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Our intelligent agent network guides you through every step — from eligibility check to loan disbursal. Fast, transparent, and fully digital.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/loans">
              <Button size="lg" className="gap-2 px-8" data-testid="cta-explore">
                Explore Loans
                <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/chat">
              <Button size="lg" variant="outline" className="gap-2 px-8 border-sidebar-foreground/20 text-sidebar-foreground hover:bg-sidebar-foreground/10" data-testid="cta-chat">
                <Bot size={16} />
                Talk to AI Agent
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Loan Products</h2>
            <p className="text-muted-foreground">Choose from our wide range of loan offerings tailored for every need</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(loans ?? []).map((loan) => {
              const Icon = loanTypeIcons[loan.type as keyof typeof loanTypeIcons] ?? Building2;
              const colorClass = loanTypeColors[loan.type as keyof typeof loanTypeColors] ?? "from-primary/20 to-primary/5";
              return (
                <Link key={loan.id} href={`/loans/${loan.id}`}>
                  <Card className="hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group" data-testid={`card-loan-${loan.id}`}>
                    <CardContent className="p-5 text-center">
                      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                        <Icon size={20} className="text-primary" />
                      </div>
                      <p className="text-xs font-semibold text-foreground capitalize">{loan.type} Loan</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{loan.baseInterestRate}% p.a.</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-sidebar/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">How It Works</h2>
            <p className="text-muted-foreground">Our AI agents handle the complexity so you don't have to</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Bot, title: "AI Guided Process", desc: "Master agent coordinates specialized agents for sales, verification, underwriting, and sanctioning", step: "01" },
              { icon: ShieldCheck, title: "Digital KYC", desc: "Instant Aadhaar and PAN verification with bank-grade security protocols", step: "02" },
              { icon: TrendingUp, title: "Credit Assessment", desc: "CIBIL/Experian credit score evaluation with risk-based interest rate determination", step: "03" },
              { icon: Zap, title: "Quick Disbursal", desc: "Sanctioned amount credited to your account within 3-5 business days", step: "04" },
            ].map(({ icon: Icon, title, desc, step }) => (
              <div key={step} className="relative">
                <div className="text-5xl font-black text-primary/10 mb-3">{step}</div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon size={18} className="text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            {[
              { value: "6+", label: "Loan Products" },
              { value: "10 Min", label: "Approval Time" },
              { value: "7.5%", label: "Starting Interest Rate" },
            ].map(({ value, label }) => (
              <div key={label} className="p-6">
                <div className="text-4xl font-black text-primary mb-2">{value}</div>
                <div className="text-muted-foreground text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-sidebar">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-sidebar-foreground mb-4">Ready to get started?</h2>
          <p className="text-sidebar-foreground/70 mb-8">Talk to our AI agent and get a loan offer in minutes</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2 px-8" data-testid="cta-signup">
                Create Free Account
                <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/loans">
              <Button size="lg" variant="outline" className="gap-2 border-sidebar-foreground/20 text-sidebar-foreground hover:bg-sidebar-foreground/10 px-8">
                View All Loans
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
