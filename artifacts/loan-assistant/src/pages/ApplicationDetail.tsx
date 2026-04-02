import { useParams, useLocation } from "wouter";
import { useGetApplication, getGetApplicationQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, CheckCircle2, Clock, AlertCircle, XCircle, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

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

const timelineSteps = [
  { key: "pending", label: "Application Submitted" },
  { key: "kyc_review", label: "KYC Review" },
  { key: "document_review", label: "Document Verification" },
  { key: "underwriting", label: "Credit Assessment" },
  { key: "sanctioned", label: "Loan Sanctioned" },
  { key: "locked", label: "Loan Locked" },
  { key: "disbursed", label: "Disbursed" },
];

const statusOrder = ["pending", "kyc_review", "document_review", "underwriting", "sanctioned", "locked", "disbursed"];

function formatCurrency(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const appId = parseInt(params.id ?? "0");
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated]);

  const { data: app, isLoading } = useGetApplication(appId, {
    query: { enabled: !!appId, queryKey: getGetApplicationQueryKey(appId) },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!app) return <div className="p-8 text-center text-muted-foreground">Application not found</div>;

  const currentStatusIndex = statusOrder.indexOf(app.status);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-sidebar py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setLocation("/applications")} className="flex items-center gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground mb-4 text-sm transition-colors">
            <ChevronLeft size={16} />
            Back to Applications
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-sidebar-foreground">{app.loanProductName}</h1>
            <Badge className={`${statusColors[app.status] ?? ""} text-xs border-0`}>
              {statusLabels[app.status] ?? app.status}
            </Badge>
          </div>
          <p className="text-sidebar-foreground/60 text-sm mt-1">Application ID: #{app.id}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Application Status</CardTitle></CardHeader>
          <CardContent>
            {app.status === "rejected" ? (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800/30">
                <XCircle size={20} className="text-red-500" />
                <div>
                  <div className="font-semibold text-red-800 dark:text-red-400">Application Rejected</div>
                  {app.remarks && <div className="text-sm text-red-600 dark:text-red-500 mt-1">{app.remarks}</div>}
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="space-y-0">
                  {timelineSteps.map((step, idx) => {
                    const stepIndex = statusOrder.indexOf(step.key);
                    const isDone = stepIndex < currentStatusIndex;
                    const isCurrent = step.key === app.status;
                    const isFuture = stepIndex > currentStatusIndex;

                    return (
                      <div key={step.key} className="flex items-start gap-4 pb-4 last:pb-0">
                        <div className="relative flex flex-col items-center">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                            isDone ? "bg-green-500" : isCurrent ? "bg-primary" : "bg-muted border border-border"
                          }`}>
                            {isDone ? <CheckCircle2 size={14} className="text-white" /> :
                             isCurrent ? <Clock size={14} className="text-primary-foreground" /> :
                             <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />}
                          </div>
                          {idx < timelineSteps.length - 1 && (
                            <div className={`w-0.5 h-4 mt-1 ${isDone ? "bg-green-500" : "bg-border"}`} />
                          )}
                        </div>
                        <div className={`pt-0.5 ${isFuture ? "opacity-40" : ""}`}>
                          <div className={`text-sm font-medium ${isCurrent ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"}`}>
                            {step.label}
                          </div>
                          {isCurrent && <div className="text-xs text-muted-foreground mt-0.5">In progress</div>}
                          {isDone && <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">Completed</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Loan Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Loan Amount", value: formatCurrency(app.loanAmount) },
                { label: "Monthly EMI", value: formatCurrency(app.monthlyEmi) },
                { label: "Tenure", value: `${app.tenureMonths} months` },
                { label: "Credit Score", value: app.creditScore ? app.creditScore.toString() : "Pending" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Applicant Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Name", value: app.applicantName },
                { label: "Email", value: app.applicantEmail },
                { label: "Phone", value: app.applicantPhone },
                { label: "Employment", value: app.employmentType ?? "Not provided" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {app.lockingId && (
          <Card className="border-teal-200 dark:border-teal-800/30 bg-teal-50 dark:bg-teal-900/10">
            <CardContent className="py-5 flex items-center gap-3">
              <Lock size={20} className="text-teal-600 dark:text-teal-400" />
              <div>
                <div className="font-semibold text-teal-800 dark:text-teal-300 text-sm">Loan Locked</div>
                <div className="text-xs text-teal-600 dark:text-teal-400">Locking ID: <span className="font-mono font-bold">{app.lockingId}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {app.remarks && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              Remarks
            </CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{app.remarks}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
