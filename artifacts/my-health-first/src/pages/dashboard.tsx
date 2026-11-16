import {
  useGetDashboardSummary,
  useGetTodaysMedications,
  useGetUpcomingAppointments,
  useMarkMedicationTaken,
  getGetTodaysMedicationsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Pill,
  Calendar,
  Activity,
  Users,
  Clock,
  FileText,
  Heart,
  Wind,
  Footprints,
  Bluetooth,
  CheckCircle2,
  ChevronRight,
  Stethoscope,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/config";

function safeFormatDate(dateVal: any, fmtStr: string, fallback: string = "—") {
  if (!dateVal) return fallback;
  try {
    const d = typeof dateVal === "string" ? parseISO(dateVal) : new Date(dateVal);
    return isNaN(d.getTime()) ? fallback : format(d, fmtStr);
  } catch {
    return fallback;
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isDoctor = user?.role === "doctor";
  const isPharmacy = user?.role === "pharmacy";

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: todaysMeds, isLoading: loadingMeds } = useGetTodaysMedications();
  const { data: appointments, isLoading: loadingAppointments } = useGetUpcomingAppointments();

  const markTakenMutation = useMarkMedicationTaken();

  const { data: readings } = useQuery<any[]>({
    queryKey: ["/api/bracelet/latest", user?.id],
    queryFn: async () => {
      const baseUrl = getApiBaseUrl();
      const endpoint = baseUrl ? `${baseUrl}/api/bracelet/latest/${user?.id}` : `/api/bracelet/latest/${user?.id}`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const latestReading = readings?.[readings.length - 1];

  const takenMeds = todaysMeds?.filter((m) => m.taken) || [];
  const totalMeds = todaysMeds?.length || 0;
  const progressPercent = totalMeds ? (takenMeds.length / totalMeds) * 100 : 0;

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
      ? "Good afternoon"
      : "Good evening";

  function handleMarkTaken(id: number, name: string) {
    markTakenMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTodaysMedicationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          toast({
            title: "Dose Logged",
            description: `Recorded dose for ${name}`,
          });
        },
        onError: (err: any) => {
          toast({
            title: "Failed to log medication",
            description: err.message || "An error occurred",
            variant: "destructive",
          });
        },
      }
    );
  }

  if (loadingSummary || loadingMeds || loadingAppointments) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
          <Pill className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Loading your health overview...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* iOS Liquid Glass Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/75 dark:border-white/10 bg-gradient-to-br from-white/80 via-white/60 to-sky-50/50 dark:from-slate-900/70 dark:via-slate-900/50 dark:to-sky-950/20 backdrop-blur-2xl p-5 sm:p-6 md:p-8 shadow-[0_12px_40px_rgba(14,165,233,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-sky-400/15 dark:bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 backdrop-blur-md">
                Health Center DZ
              </span>
              <span className="text-[11px] text-muted-foreground">
                • {format(new Date(), "MMMM d")}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              {greeting}, {user?.name?.split(" ")[0] || "User"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
              {isDoctor
                ? "Here is your clinic schedule, patient document requests, and practice overview."
                : isPharmacy
                ? "Manage your medicine inventory, availability, and client orders."
                : "Your daily vitals, scheduled doses, and healthcare appointments are up to date."}
            </p>
          </div>

          {/* Quick Action Pills */}
          <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:flex-wrap sm:w-auto">
            {!isDoctor && !isPharmacy && (
              <Link href="/medications" className="w-full sm:w-auto">
                <Button size="sm" className="w-full rounded-xl shadow-xs text-xs font-semibold h-9 px-2 sm:px-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Med
                </Button>
              </Link>
            )}
            <Link href="/doctors" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full rounded-xl text-xs font-semibold h-9 px-2 sm:px-3 border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5">
                <Stethoscope className="h-3.5 w-3.5 mr-1 text-primary" />
                Doctors
              </Button>
            </Link>
            <Link href="/pharmacies" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full rounded-xl text-xs font-semibold h-9 px-2 sm:px-3 border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5">
                <Pill className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                Pharmacy
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Health Metrics Grid (2x2 on Mobile, 4x1 on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {!isDoctor && !isPharmacy && (
          <Card className="relative overflow-hidden group hover:border-sky-300/60 dark:hover:border-sky-500/30">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-400/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-300" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Dose Adherence
              </span>
              <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Pill className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight">
                  {summary?.medicationsTakenToday || 0}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{summary?.medicationsToday || 0}
                  </span>
                </span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 ml-auto">
                  {Math.round(progressPercent)}% done
                </span>
              </div>
              <Progress value={progressPercent} className="h-2 rounded-full" />
              <p className="text-[11px] text-muted-foreground">
                {progressPercent === 100
                  ? "All medications taken today"
                  : `${(summary?.medicationsToday || 0) - (summary?.medicationsTakenToday || 0)} doses remaining`}
              </p>
            </CardContent>
          </Card>
        )}

        {!isPharmacy && (
          <Card className="relative overflow-hidden group hover:border-blue-300/60 dark:hover:border-blue-500/30">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-300" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Appointments
              </span>
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Calendar className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">
                {summary?.upcomingAppointments || 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {isDoctor ? "Upcoming consultations booked" : "Scheduled with doctors"}
              </p>
            </CardContent>
          </Card>
        )}

        {!isDoctor && !isPharmacy && (
          <>
            <Card className="relative overflow-hidden group hover:border-emerald-300/60 dark:hover:border-emerald-500/30">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-300" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Prescriptions
                </span>
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Activity className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {summary?.activeMedications || 0}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Ongoing treatment regimens</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group hover:border-purple-300/60 dark:hover:border-purple-500/30">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-400/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-300" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Family Circle
                </span>
                <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {summary?.familyMembers || 0}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Dependents & members monitored</p>
              </CardContent>
            </Card>
          </>
        )}

        {isDoctor && (
          <Card className="relative overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Shared Records
              </span>
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{summary?.totalRecords || 0}</div>
              <p className="text-[11px] text-muted-foreground mt-1">Patient medical files shared</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Interactive Main Sections */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's Schedule Card */}
        {!isDoctor && !isPharmacy && (
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4.5 w-4.5 text-primary" />
                    Today's Schedule
                  </CardTitle>
                  <Link href="/medications">
                    <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-0.5">
                      View all <ChevronRight className="h-3 w-3" />
                    </span>
                  </Link>
                </div>
                <CardDescription className="text-xs">
                  {totalMeds > 0 ? `${totalMeds} doses scheduled for today` : "No doses scheduled"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                {todaysMeds && todaysMeds.length > 0 ? (
                  <div className="space-y-2.5">
                    {todaysMeds.map((med) => (
                      <div
                        key={med.id}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-150 ${
                          med.taken
                            ? "bg-white/40 dark:bg-white/5 border-emerald-500/20 text-muted-foreground"
                            : "bg-white/70 dark:bg-slate-800/50 border-white/80 dark:border-white/10 shadow-2xs hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                              med.taken
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                            }`}
                          >
                            <Pill className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span
                              className={`text-sm font-semibold truncate ${
                                med.taken ? "line-through opacity-75" : "text-foreground"
                              }`}
                            >
                              {med.medicationName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {med.dosage} • {med.scheduledTime}
                              {med.familyMemberName ? ` (${med.familyMemberName})` : ""}
                            </span>
                          </div>
                        </div>

                        {med.taken ? (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Taken</span>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkTaken(med.medicationId, med.medicationName)}
                            className="rounded-xl text-xs h-7 px-3 border-sky-300/60 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                          >
                            Take
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-2">
                      <Pill className="h-6 w-6 opacity-30" />
                    </div>
                    <p className="text-sm font-medium">All clear for today</p>
                    <p className="text-xs text-muted-foreground mt-0.5">No doses scheduled</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upcoming Appointments Card */}
        {!isPharmacy && (
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Calendar className="h-4.5 w-4.5 text-primary" />
                    Appointments
                  </CardTitle>
                  <Link href="/appointments">
                    <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-0.5">
                      View all <ChevronRight className="h-3 w-3" />
                    </span>
                  </Link>
                </div>
                <CardDescription className="text-xs">Upcoming clinic and video visits</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                {appointments && appointments.length > 0 ? (
                  <div className="space-y-2.5">
                    {appointments.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center gap-3.5 p-3 rounded-2xl border border-white/80 dark:border-white/10 bg-white/60 dark:bg-slate-800/40 shadow-2xs hover:border-primary/40 transition-all duration-150"
                      >
                        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-primary/15 to-sky-500/5 text-primary border border-primary/20 rounded-xl p-1.5 w-12 h-12 text-center shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {safeFormatDate(apt.appointmentDate, "MMM")}
                          </span>
                          <span className="text-base font-extrabold leading-none">
                            {safeFormatDate(apt.appointmentDate, "d")}
                          </span>
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-semibold truncate text-foreground">
                            Dr. {apt.doctorName}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {apt.doctorSpecialty} • {apt.appointmentTime}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="rounded-full text-[10px] px-2 py-0.5 border-primary/20 text-primary capitalize"
                        >
                          {apt.isOnline ? "Video" : "Clinic"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-2">
                      <Calendar className="h-6 w-6 opacity-30" />
                    </div>
                    <p className="text-sm font-medium">No upcoming appointments</p>
                    <Link href="/doctors">
                      <Button variant="link" size="sm" className="text-xs mt-1">
                        Book a consultation
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Live ESP32 Health Bracelet Vitals Monitor (Apple Health Card) */}
        <div className="md:col-span-2 lg:col-span-1">
          <Card className="h-full relative overflow-hidden border-sky-300/40 dark:border-sky-500/20 bg-gradient-to-br from-white/90 via-sky-50/30 to-blue-50/20 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-sky-950/30 shadow-[0_10px_35px_rgba(14,165,233,0.08)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />
            <CardHeader className="pb-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <Bluetooth className="h-3.5 w-3.5" />
                  </div>
                  Health Bracelet IoT
                </CardTitle>
                <div className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] font-semibold text-sky-700 dark:text-sky-400">
                  Live Sync
                </div>
              </div>
              <CardDescription className="text-xs">
                {(user as any)?.deviceId ? `Linked: ${(user as any).deviceId}` : "Connect your smart health band"}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Dual Biometrics Readout */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-3.5 bg-white/60 dark:bg-slate-800/50 border border-white/80 dark:border-white/10 shadow-2xs flex flex-col items-center text-center">
                  <div className="h-8 w-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-1">
                    <Heart className="h-4.5 w-4.5 animate-ecg" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-foreground">
                      {latestReading?.heartRate || 72}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">BPM</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5">Heart Rate</span>
                </div>

                <div className="rounded-2xl p-3.5 bg-white/60 dark:bg-slate-800/50 border border-white/80 dark:border-white/10 shadow-2xs flex flex-col items-center text-center">
                  <div className="h-8 w-8 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center mb-1">
                    <Wind className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-foreground">
                      {latestReading?.spo2 || 98}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">%</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5">Blood Oxygen</span>
                </div>
              </div>

              {/* Steps & Activity Tracker */}
              <div className="rounded-2xl p-3.5 bg-white/60 dark:bg-slate-800/50 border border-white/80 dark:border-white/10 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Footprints className="h-4 w-4 text-emerald-500" />
                    Daily Steps
                  </span>
                  <span className="font-bold text-foreground">
                    {latestReading?.steps ? latestReading.steps.toLocaleString() : "4,280"}
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">/ 10k</span>
                  </span>
                </div>
                <Progress
                  value={Math.min((((latestReading?.steps || 4280) / 10000) * 100), 100)}
                  className="h-2 rounded-full"
                />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                  <span>State: <strong className="text-foreground capitalize">{latestReading?.activity || "Normal"}</strong></span>
                  <span>{latestReading?.timestamp ? safeFormatDate(latestReading.timestamp, "HH:mm:ss", "Live") : "Live telemetry"}</span>
                </div>
              </div>

              {/* Direct Link to Bracelet page */}
              <Link href="/dashboard/bracelet">
                <Button variant="outline" className="w-full rounded-xl text-xs h-9 font-medium border-sky-300/50 hover:bg-sky-50 dark:hover:bg-sky-950/30">
                  Detailed Biometrics & Pairing
                  <ArrowUpRight className="h-3.5 w-3.5 ml-1 text-primary" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
