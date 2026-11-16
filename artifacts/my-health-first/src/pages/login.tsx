import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Pill, ShieldCheck, Server, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl, saveApiBaseUrl } from "@/lib/config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: setAuth } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl() || "http://10.11.146.76:5000");
  const [serverDialogOpen, setServerDialogOpen] = useState(false);

  function handleSaveServer() {
    saveApiBaseUrl(serverUrl);
    setServerDialogOpen(false);
    toast({
      title: "Server Updated",
      description: `Backend configured to: ${serverUrl || "Relative"}`,
    });
  }

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: LoginFormValues) {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          setAuth(res.token, res.user);
          setLocation("/dashboard");
        },
        onError: (error: any) => {
          toast({
            title: "Login Failed",
            description: error.message || "Invalid credentials",
            variant: "destructive",
          });
        },
      }
    );
  }

  function fillDemoAdmin() {
    form.setValue("email", "admin@health.com");
    form.setValue("password", "admin123");
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background">
      {/* iOS Liquid Glass Ambient Background Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-gradient-to-br from-sky-400/25 to-blue-500/10 dark:from-sky-500/15 dark:to-transparent blur-[110px] animate-drift-slow" />
        <div className="absolute top-1/3 -right-32 w-[32rem] h-[32rem] rounded-full bg-gradient-to-bl from-emerald-400/20 to-teal-500/10 dark:from-emerald-500/10 dark:to-transparent blur-[120px] animate-drift-reverse" />
        <div className="absolute -bottom-40 left-1/3 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-indigo-400/20 to-sky-400/10 dark:from-indigo-500/10 dark:to-transparent blur-[130px] animate-drift-slow" />
      </div>

      {/* Floating Liquid Glass Card */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/65 backdrop-blur-2xl shadow-[0_20px_60px_rgba(14,165,233,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-8">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white flex items-center justify-center mb-3 shadow-[0_4px_20px_rgba(14,165,233,0.35)]">
            <Pill className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Welcome back</h1>
          <p className="text-muted-foreground text-xs mt-1">Sign in to your health portal</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Email address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="you@example.com"
                      type="email"
                      className="rounded-xl border-white/80 dark:border-white/10 bg-white/60 dark:bg-slate-800/50 backdrop-blur-md text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="••••••••"
                      type="password"
                      className="rounded-xl border-white/80 dark:border-white/10 bg-white/60 dark:bg-slate-800/50 backdrop-blur-md text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full rounded-xl h-11 text-sm font-semibold shadow-[0_4px_20px_rgba(14,165,233,0.35)] mt-2"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>

        {/* Demo Fast Login Pill */}
        <div className="mt-5 p-3 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/60 dark:border-white/10 backdrop-blur-md flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Admin Demo: <strong className="text-foreground">admin@health.com</strong></span>
          </div>
          <button
            type="button"
            onClick={fillDemoAdmin}
            className="text-primary font-semibold hover:underline cursor-pointer"
          >
            Auto-fill
          </button>
        </div>

        {/* Server Endpoint Config (Crucial for Mobile APK & Network access) */}
        <div className="mt-2.5 flex items-center justify-center">
          <Dialog open={serverDialogOpen} onOpenChange={setServerDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium text-muted-foreground/80 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Server className="h-3 w-3 text-sky-500" />
                <span>Backend: {serverUrl ? serverUrl.replace(/^https?:\/\//, "") : "Direct"}</span>
                <Settings2 className="h-2.5 w-2.5 opacity-60" />
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl border border-white/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Server className="h-4 w-4 text-sky-500" />
                  API Server Connection
                </DialogTitle>
                <DialogDescription className="text-xs">
                  For mobile APK on your phone, set this to your computer's local Wi-Fi IP address so the phone can reach the backend.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Server URL</label>
                  <Input
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://10.11.146.76:5000"
                    className="rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setServerUrl("http://10.11.146.76:5000")}
                    className="text-[11px] rounded-xl flex-1"
                  >
                    Use Host PC IP
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setServerUrl("")}
                    className="text-[11px] rounded-xl flex-1"
                  >
                    Reset (Relative)
                  </Button>
                </div>
                <Button
                  type="button"
                  onClick={handleSaveServer}
                  className="w-full rounded-xl text-xs bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm mt-2"
                >
                  Save Connection Settings
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-6 text-center text-xs">
          <span className="text-muted-foreground">Don't have an account? </span>
          <Link href="/register">
            <span className="text-primary font-semibold hover:underline cursor-pointer">Register now</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
