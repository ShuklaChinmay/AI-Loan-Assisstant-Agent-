import { Link } from "wouter";
import { useListLoans } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Home, Car, GraduationCap, Briefcase, Building2, Gem, CheckCircle2 } from "lucide-react";

const loanTypeIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  home: Home,
  personal: Building2,
  business: Briefcase,
  education: GraduationCap,
  vehicle: Car,
  gold: Gem,
};

const loanTypeBadgeColors: Record<string, string> = {
  home: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  personal: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  business: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  education: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  vehicle: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  gold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

function formatAmount(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(0)} L`;
  return `${(amount / 1000).toFixed(0)}K`;
}

export default function LoanExplorePage() {
  const { data: loans, isLoading } = useListLoans();

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-sidebar py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-sidebar-foreground mb-2">Loan Products</h1>
          <p className="text-sidebar-foreground/70">Explore our range of financial solutions tailored for every need</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader>
                  <Skeleton className="h-10 w-10 rounded-lg mb-2" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full mb-4" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(loans ?? []).map((loan) => {
              const Icon = loanTypeIcons[loan.type] ?? Building2;
              const badgeClass = loanTypeBadgeColors[loan.type] ?? "bg-gray-100 text-gray-800";

              return (
                <Card key={loan.id} className="group hover:border-primary/40 hover:shadow-lg transition-all overflow-hidden" data-testid={`card-loan-${loan.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon size={22} className="text-primary" />
                      </div>
                      <Badge className={`${badgeClass} border-0 text-xs capitalize`}>{loan.type}</Badge>
                    </div>
                    <CardTitle className="text-lg">{loan.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm line-clamp-2">{loan.description}</p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Loan Amount</div>
                        <div className="font-semibold text-foreground text-sm">
                          {formatAmount(loan.minAmount)} - {formatAmount(loan.maxAmount)}
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Interest Rate</div>
                        <div className="font-semibold text-primary text-sm">{loan.baseInterestRate}% p.a.</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {(loan.eligibilityCriteria as string[]).slice(0, 2).map((crit, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{crit}</span>
                        </div>
                      ))}
                    </div>

                    <Link href={`/loans/${loan.id}`}>
                      <Button className="w-full gap-2" variant="outline" data-testid={`button-view-loan-${loan.id}`}>
                        View Details
                        <ArrowRight size={14} />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
