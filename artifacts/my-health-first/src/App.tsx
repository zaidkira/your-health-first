import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Medications from "@/pages/medications";
import Records from "@/pages/records";
import Doctors from "@/pages/doctors";
import Appointments from "@/pages/appointments";
import Pharmacies from "@/pages/pharmacies";
import Family from "@/pages/family";
import AppLayout from "@/components/layout/AppLayout";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path="/">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/medications">
        <ProtectedRoute component={Medications} />
      </Route>
      <Route path="/records">
        <ProtectedRoute component={Records} />
      </Route>
      <Route path="/doctors">
        <ProtectedRoute component={Doctors} />
      </Route>
      <Route path="/appointments">
        <ProtectedRoute component={Appointments} />
      </Route>
      <Route path="/pharmacies">
        <ProtectedRoute component={Pharmacies} />
      </Route>
      <Route path="/family">
        <ProtectedRoute component={Family} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
