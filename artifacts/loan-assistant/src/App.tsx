import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/common/Navbar";
import NotFound from "@/pages/not-found";

import HomePage from "@/pages/Home";
import LoginPage from "@/pages/Login";
import SignupPage from "@/pages/Signup";
import LoanExplorePage from "@/pages/LoanExplore";
import LoanDetailsPage from "@/pages/LoanDetails";
import ChatPage from "@/pages/ChatPage";
import ApplicationsPage from "@/pages/Applications";
import ApplicationDetailPage from "@/pages/ApplicationDetail";
import AdminPanelPage from "@/pages/AdminPanel";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

function NoNavLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => (
        <Layout><HomePage /></Layout>
      )} />
      <Route path="/login" component={() => (
        <NoNavLayout><LoginPage /></NoNavLayout>
      )} />
      <Route path="/signup" component={() => (
        <NoNavLayout><SignupPage /></NoNavLayout>
      )} />
      <Route path="/loans" component={() => (
        <Layout><LoanExplorePage /></Layout>
      )} />
      <Route path="/loans/:id" component={(params) => (
        <Layout><LoanDetailsPage /></Layout>
      )} />
      <Route path="/chat" component={() => (
        <Layout><ChatPage /></Layout>
      )} />
      <Route path="/applications" component={() => (
        <Layout><ApplicationsPage /></Layout>
      )} />
      <Route path="/applications/:id" component={() => (
        <Layout><ApplicationDetailPage /></Layout>
      )} />
      <Route path="/admin" component={() => (
        <Layout><AdminPanelPage /></Layout>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
