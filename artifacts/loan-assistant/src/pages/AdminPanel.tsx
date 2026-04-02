import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useListUsers, getListUsersQueryKey,
  useListAllApplications, getListAllApplicationsQueryKey,
  useListLoans, getListLoansQueryKey,
  useCreateLoanProduct, useUpdateLoanProduct, useDeleteLoanProduct,
  useUpdateApplicationStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Users, LayoutDashboard, CreditCard, FileText, Plus, Pencil, Trash2 } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  kyc_review: "bg-blue-100 text-blue-800",
  document_review: "bg-orange-100 text-orange-800",
  underwriting: "bg-purple-100 text-purple-800",
  sanctioned: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  locked: "bg-teal-100 text-teal-800",
  disbursed: "bg-emerald-100 text-emerald-800",
};

function formatCurrency(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatAmount(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(0)}L`;
  return `${(amount / 1000).toFixed(0)}K`;
}

export default function AdminPanelPage() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) { setLocation("/login"); return; }
    if (user && user.role !== "admin") { setLocation("/loans"); return; }
  }, [isAuthenticated, user]);

  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });
  const { data: users } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const { data: allApplications } = useListAllApplications({ query: { queryKey: getListAllApplicationsQueryKey() } });
  const { data: loans } = useListLoans({ query: { queryKey: getListLoansQueryKey() } });

  const createLoanMutation = useCreateLoanProduct();
  const updateLoanMutation = useUpdateLoanProduct();
  const deleteLoanMutation = useDeleteLoanProduct();
  const updateStatusMutation = useUpdateApplicationStatus();

  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<typeof loans extends Array<infer T> ? T | null : null>(null);
  const [loanForm, setLoanForm] = useState({
    name: "", type: "personal", description: "", minAmount: 50000, maxAmount: 1000000,
    minTenureMonths: 12, maxTenureMonths: 60, baseInterestRate: 10.5, processingFeePercent: 1.0,
    eligibilityCriteria: "", documentsRequired: "", isActive: true,
  });

  const openNewLoanDialog = () => {
    setEditingLoan(null);
    setLoanForm({ name: "", type: "personal", description: "", minAmount: 50000, maxAmount: 1000000, minTenureMonths: 12, maxTenureMonths: 60, baseInterestRate: 10.5, processingFeePercent: 1.0, eligibilityCriteria: "", documentsRequired: "", isActive: true });
    setLoanDialogOpen(true);
  };

  const openEditLoanDialog = (loan: NonNullable<typeof loans>[0]) => {
    setEditingLoan(loan as unknown as null);
    setLoanForm({
      name: loan.name, type: loan.type, description: loan.description,
      minAmount: loan.minAmount, maxAmount: loan.maxAmount,
      minTenureMonths: loan.minTenureMonths, maxTenureMonths: loan.maxTenureMonths,
      baseInterestRate: loan.baseInterestRate, processingFeePercent: loan.processingFeePercent,
      eligibilityCriteria: (loan.eligibilityCriteria as string[]).join("\n"),
      documentsRequired: (loan.documentsRequired as string[]).join("\n"),
      isActive: loan.isActive,
    });
    setLoanDialogOpen(true);
  };

  const handleSaveLoan = () => {
    const data = {
      ...loanForm,
      eligibilityCriteria: loanForm.eligibilityCriteria.split("\n").filter(Boolean),
      documentsRequired: loanForm.documentsRequired.split("\n").filter(Boolean),
    };

    if (editingLoan) {
      updateLoanMutation.mutate({ id: (editingLoan as { id: number }).id, data }, {
        onSuccess: () => {
          toast({ title: "Loan product updated" });
          setLoanDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: getListLoansQueryKey() });
        },
      });
    } else {
      createLoanMutation.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Loan product created" });
          setLoanDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: getListLoansQueryKey() });
        },
      });
    }
  };

  const handleDeleteLoan = (id: number) => {
    deleteLoanMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Loan product deleted" });
        queryClient.invalidateQueries({ queryKey: getListLoansQueryKey() });
      },
    });
  };

  const handleUpdateAppStatus = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, data: { status: status as "pending" } }, {
      onSuccess: () => {
        toast({ title: "Status updated" });
        queryClient.invalidateQueries({ queryKey: getListAllApplicationsQueryKey() });
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-sidebar py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-sidebar-foreground">Admin Panel</h1>
          <p className="text-sidebar-foreground/70 text-sm mt-1">Manage loan products, users, and applications</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="gap-2" data-testid="tab-dashboard">
              <LayoutDashboard size={14} /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="loans" className="gap-2" data-testid="tab-loans">
              <CreditCard size={14} /> Loan Products
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-2" data-testid="tab-applications">
              <FileText size={14} /> Applications
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2" data-testid="tab-users">
              <Users size={14} /> Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {summaryLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            ) : summary && (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: "Total Applications", value: summary.totalApplications, color: "text-primary" },
                    { label: "Pending Review", value: summary.pendingApplications, color: "text-yellow-600" },
                    { label: "Approved", value: summary.approvedApplications, color: "text-green-600" },
                    { label: "Total Users", value: summary.totalUsers, color: "text-blue-600" },
                  ].map(({ label, value, color }) => (
                    <Card key={label}>
                      <CardContent className="pt-5">
                        <div className={`text-3xl font-black mb-1 ${color}`}>{value}</div>
                        <div className="text-sm text-muted-foreground">{label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Recent Applications</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {summary.recentApplications.slice(0, 5).map((app) => (
                          <div key={app.id} className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium">{app.applicantName}</div>
                              <div className="text-xs text-muted-foreground">{app.loanProductName} — {formatCurrency(app.loanAmount)}</div>
                            </div>
                            <Badge className={`${statusColors[app.status] ?? ""} text-[10px] border-0`}>{app.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">By Status</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {summary.applicationsByStatus.map(({ status, count }) => (
                          <div key={status} className="flex items-center gap-3">
                            <div className="text-xs text-muted-foreground capitalize w-28">{status.replace("_", " ")}</div>
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min((count / summary.totalApplications) * 100, 100)}%` }} />
                            </div>
                            <div className="text-xs font-medium w-6 text-right">{count}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="loans">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-foreground">Loan Products ({loans?.length ?? 0})</h2>
              <Button size="sm" className="gap-2" onClick={openNewLoanDialog} data-testid="button-add-loan">
                <Plus size={14} /> Add Loan Product
              </Button>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(loans ?? []).map((loan) => (
                    <TableRow key={loan.id} data-testid={`row-loan-${loan.id}`}>
                      <TableCell className="font-medium">{loan.name}</TableCell>
                      <TableCell className="capitalize">{loan.type}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatAmount(loan.minAmount)} - {formatAmount(loan.maxAmount)}</TableCell>
                      <TableCell>{loan.baseInterestRate}%</TableCell>
                      <TableCell>
                        <Badge className={loan.isActive ? "bg-green-100 text-green-800 border-0" : "bg-gray-100 text-gray-600 border-0"}>
                          {loan.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => openEditLoanDialog(loan)} data-testid={`button-edit-loan-${loan.id}`}>
                            <Pencil size={12} />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteLoan(loan.id)} data-testid={`button-delete-loan-${loan.id}`}>
                            <Trash2 size={12} className="text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="applications">
            <h2 className="font-semibold text-foreground mb-4">All Applications ({allApplications?.length ?? 0})</h2>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Loan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Update Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(allApplications ?? []).map((app) => (
                    <TableRow key={app.id} data-testid={`row-application-${app.id}`}>
                      <TableCell>
                        <div className="font-medium text-sm">{app.applicantName}</div>
                        <div className="text-xs text-muted-foreground">{app.applicantEmail}</div>
                      </TableCell>
                      <TableCell className="text-sm">{app.loanProductName}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(app.loanAmount)}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[app.status] ?? ""} text-[10px] border-0`}>{app.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select onValueChange={(v) => handleUpdateAppStatus(app.id, v)} defaultValue={app.status}>
                          <SelectTrigger className="h-7 text-xs w-36" data-testid={`select-status-${app.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["pending","kyc_review","document_review","underwriting","sanctioned","rejected","locked","disbursed"].map(s => (
                              <SelectItem key={s} value={s} className="text-xs">{s.replace("_", " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <h2 className="font-semibold text-foreground mb-4">All Users ({users?.length ?? 0})</h2>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead>Credit Score</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(users ?? []).map((u) => (
                    <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                      <TableCell className="font-medium text-sm">{u.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="text-sm">{u.phone}</TableCell>
                      <TableCell>
                        <Badge className={u.role === "admin" ? "bg-primary/20 text-primary border-0" : "bg-muted text-muted-foreground border-0"}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={u.kycCompleted ? "bg-green-100 text-green-800 border-0" : "bg-yellow-100 text-yellow-800 border-0"}>
                          {u.kycCompleted ? "Done" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{u.creditScore ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={loanDialogOpen} onOpenChange={setLoanDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLoan ? "Edit Loan Product" : "Add Loan Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={loanForm.name} onChange={(e) => setLoanForm(f => ({ ...f, name: e.target.value }))} data-testid="input-loan-name" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={loanForm.type} onValueChange={(v) => setLoanForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["home","personal","business","education","vehicle","gold"].map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Interest Rate (%)</Label>
              <Input type="number" step="0.1" value={loanForm.baseInterestRate} onChange={(e) => setLoanForm(f => ({ ...f, baseInterestRate: parseFloat(e.target.value) }))} data-testid="input-interest-rate" />
            </div>
            <div>
              <Label>Min Amount (Rs.)</Label>
              <Input type="number" value={loanForm.minAmount} onChange={(e) => setLoanForm(f => ({ ...f, minAmount: parseInt(e.target.value) }))} />
            </div>
            <div>
              <Label>Max Amount (Rs.)</Label>
              <Input type="number" value={loanForm.maxAmount} onChange={(e) => setLoanForm(f => ({ ...f, maxAmount: parseInt(e.target.value) }))} />
            </div>
            <div>
              <Label>Min Tenure (months)</Label>
              <Input type="number" value={loanForm.minTenureMonths} onChange={(e) => setLoanForm(f => ({ ...f, minTenureMonths: parseInt(e.target.value) }))} />
            </div>
            <div>
              <Label>Max Tenure (months)</Label>
              <Input type="number" value={loanForm.maxTenureMonths} onChange={(e) => setLoanForm(f => ({ ...f, maxTenureMonths: parseInt(e.target.value) }))} />
            </div>
            <div>
              <Label>Processing Fee (%)</Label>
              <Input type="number" step="0.1" value={loanForm.processingFeePercent} onChange={(e) => setLoanForm(f => ({ ...f, processingFeePercent: parseFloat(e.target.value) }))} />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={loanForm.description} onChange={(e) => setLoanForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Eligibility Criteria (one per line)</Label>
              <Textarea value={loanForm.eligibilityCriteria} onChange={(e) => setLoanForm(f => ({ ...f, eligibilityCriteria: e.target.value }))} rows={3} placeholder="Minimum age 21 years&#10;Credit score 700+" />
            </div>
            <div className="col-span-2">
              <Label>Documents Required (one per line)</Label>
              <Textarea value={loanForm.documentsRequired} onChange={(e) => setLoanForm(f => ({ ...f, documentsRequired: e.target.value }))} rows={3} placeholder="Aadhaar Card&#10;PAN Card" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoanDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLoan} disabled={createLoanMutation.isPending || updateLoanMutation.isPending} data-testid="button-save-loan">
              {editingLoan ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
