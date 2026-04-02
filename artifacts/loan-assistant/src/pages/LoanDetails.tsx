import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useGetLoan, getGetLoanQueryKey, useCalculateEmi, useCreateApplication } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { CheckCircle2, FileText, Calculator, ArrowRight, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function formatAmount(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Crore`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(2)} Lakh`;
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function formatCurrency(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function LoanDetailsPage() {
  const params = useParams<{ id: string }>();
  const loanId = parseInt(params.id ?? "0");
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: loan, isLoading } = useGetLoan(loanId, {
    query: { enabled: !!loanId, queryKey: getGetLoanQueryKey(loanId) },
  });

  const emiMutation = useCalculateEmi();
  const applyMutation = useCreateApplication();

  const [loanAmount, setLoanAmount] = useState(500000);
  const [tenure, setTenure] = useState(36);
  const [emiResult, setEmiResult] = useState<{ monthlyEmi: number; totalAmount: number; totalInterest: number; processingFee: number } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loan) return;
    const initAmount = Math.min(Math.max(loanAmount, loan.minAmount), loan.maxAmount);
    const initTenure = Math.min(Math.max(tenure, loan.minTenureMonths), loan.maxTenureMonths);
    setLoanAmount(initAmount);
    setTenure(initTenure);
  }, [loan]);

  useEffect(() => {
    if (!loan) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      emiMutation.mutate({
        id: loanId,
        data: { loanAmount, tenureMonths: tenure, interestRate: loan.baseInterestRate },
      }, {
        onSuccess: (result) => setEmiResult(result),
      });
    }, 300);
  }, [loanAmount, tenure, loan]);

  const handleApply = () => {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    if (!loan) return;
    applyMutation.mutate({
      data: {
        loanProductId: loan.id,
        loanAmount,
        tenureMonths: tenure,
        monthlyEmi: emiResult?.monthlyEmi ?? 0,
      },
    }, {
      onSuccess: (app) => {
        toast({ title: "Application submitted!", description: "Proceeding to AI chat for guided application." });
        setLocation("/chat");
      },
      onError: () => {
        toast({ title: "Failed to submit", description: "Please try again.", variant: "destructive" });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!loan) return <div className="p-8 text-center text-muted-foreground">Loan product not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-sidebar py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => setLocation("/loans")} className="flex items-center gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground mb-4 text-sm transition-colors">
            <ChevronLeft size={16} />
            Back to Loans
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-sidebar-foreground mb-2">{loan.name}</h1>
              <p className="text-sidebar-foreground/70">{loan.description}</p>
            </div>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-sm px-3 py-1">
              {loan.baseInterestRate}% p.a.
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 size={16} className="text-green-500" />
                  Eligibility Criteria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(loan.eligibilityCriteria as string[]).map((criterion, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    {criterion}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText size={16} className="text-blue-500" />
                  Documents Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(loan.documentsRequired as string[]).map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    {doc}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Loan Range</div>
                    <div className="font-semibold text-sm text-foreground">{formatAmount(loan.minAmount)} - {formatAmount(loan.maxAmount)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Tenure</div>
                    <div className="font-semibold text-sm text-foreground">{loan.minTenureMonths / 12} - {loan.maxTenureMonths / 12} Years</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Processing Fee</div>
                    <div className="font-semibold text-sm text-foreground">{loan.processingFeePercent}%</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Interest Rate</div>
                    <div className="font-semibold text-sm text-primary">{loan.baseInterestRate}% p.a.</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator size={16} className="text-primary" />
                  EMI Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-foreground">Loan Amount</label>
                    <span className="text-sm font-bold text-primary">{formatCurrency(loanAmount)}</span>
                  </div>
                  <Slider
                    min={loan.minAmount}
                    max={loan.maxAmount}
                    step={10000}
                    value={[loanAmount]}
                    onValueChange={([v]) => setLoanAmount(v)}
                    data-testid="slider-loan-amount"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatAmount(loan.minAmount)}</span>
                    <span>{formatAmount(loan.maxAmount)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-foreground">Tenure</label>
                    <span className="text-sm font-bold text-primary">{tenure} months ({(tenure / 12).toFixed(1)} yrs)</span>
                  </div>
                  <Slider
                    min={loan.minTenureMonths}
                    max={loan.maxTenureMonths}
                    step={6}
                    value={[tenure]}
                    onValueChange={([v]) => setTenure(v)}
                    data-testid="slider-tenure"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{loan.minTenureMonths} months</span>
                    <span>{loan.maxTenureMonths} months</span>
                  </div>
                </div>

                {emiResult && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Monthly EMI</div>
                      <div className="text-3xl font-black text-primary">{formatCurrency(emiResult.monthlyEmi)}</div>
                    </div>
                    <div className="border-t border-primary/10 pt-3 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-xs text-muted-foreground">Principal</div>
                        <div className="text-sm font-semibold text-foreground">{formatCurrency(loanAmount)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Total Interest</div>
                        <div className="text-sm font-semibold text-foreground">{formatCurrency(emiResult.totalInterest)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Processing Fee</div>
                        <div className="text-sm font-semibold text-foreground">{formatCurrency(emiResult.processingFee)}</div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs border-t border-primary/10 pt-2">
                      <span className="text-muted-foreground">Total Payable</span>
                      <span className="font-bold text-foreground">{formatCurrency(emiResult.totalAmount)}</span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleApply}
                  disabled={applyMutation.isPending}
                  data-testid="button-apply"
                >
                  {applyMutation.isPending ? "Submitting..." : "Apply Now"}
                  <ArrowRight size={16} />
                </Button>
                {!isAuthenticated && (
                  <p className="text-xs text-center text-muted-foreground">You'll be asked to login first</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
