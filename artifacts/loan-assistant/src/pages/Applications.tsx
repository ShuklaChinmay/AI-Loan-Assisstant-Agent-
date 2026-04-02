import { Link } from "wouter";
import { useListApplications, getListApplicationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ArrowRight, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useLocation } from "wouter";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  kyc_review: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  document_review: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  underwriting: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  sanctioned: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  locked: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  disbursed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  kyc_review: "KYC Review",
  document_review: "Document Review",
  underwriting: "Underwriting",
  sanctioned: "Sanctioned",
  rejected: "Rejected",
  locked: "Locked",
  disbursed: "Disbursed",
};

function formatCurrency(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function ApplicationsPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: applications, isLoading } = useListApplications({
    query: { queryKey: getListApplicationsQueryKey() },
  });

  useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-sidebar py-8 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-sidebar-foreground">My Applications</h1>
            <p className="text-sidebar-foreground/70 text-sm mt-1">Track your loan application status</p>
          </div>
          <Link href="/loans">
            <Button className="gap-2" data-testid="button-new-application">
              <Plus size={16} />
              New Application
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : !applications || applications.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No applications yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Start your loan journey by exploring our loan products</p>
            <Link href="/loans">
              <Button data-testid="button-explore-loans">Explore Loans</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <Card key={app.id} className="hover:border-primary/30 transition-all" data-testid={`card-application-${app.id}`}>
                <CardContent className="py-5 px-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-foreground">{app.loanProductName}</h3>
                        <Badge className={`${statusColors[app.status] ?? ""} text-xs border-0`}>
                          {statusLabels[app.status] ?? app.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>Amount: <span className="font-medium text-foreground">{formatCurrency(app.loanAmount)}</span></span>
                        <span>EMI: <span className="font-medium text-foreground">{formatCurrency(app.monthlyEmi)}/mo</span></span>
                        <span>Tenure: <span className="font-medium text-foreground">{app.tenureMonths} months</span></span>
                      </div>
                      {app.lockingId && (
                        <div className="text-xs text-muted-foreground">
                          Locking ID: <span className="font-mono font-medium text-foreground">{app.lockingId}</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Applied: {new Date(app.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <Link href={`/applications/${app.id}`}>
                      <Button variant="outline" size="sm" className="gap-2 flex-shrink-0" data-testid={`button-view-application-${app.id}`}>
                        View Details
                        <ArrowRight size={14} />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
