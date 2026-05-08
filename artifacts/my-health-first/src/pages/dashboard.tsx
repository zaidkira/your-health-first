import { useGetDashboardSummary, useGetTodaysMedications, useGetUpcomingAppointments } from "@workspace/api-client-react";
import { Pill, Calendar, Activity, Users, Clock, AlertCircle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Heart, Wind, Footprints, Bluetooth } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user } = useAuth();
  const isDoctor = user?.role === "doctor";
  const isPharmacy = user?.role === "pharmacy";
  const isPatient = !isDoctor && !isPharmacy;
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: todaysMeds, isLoading: loadingMeds } = useGetTodaysMedications();
  const { data: appointments, isLoading: loadingAppointments } = useGetUpcomingAppointments();
  const { data: readings } = useQuery<any[]>({
    queryKey: ["/api/bracelet/latest", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/bracelet/latest/${user?.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const latestReading = readings?.[readings.length - 1];

  const takenMeds = todaysMeds?.filter(m => m.taken) || [];
  const progressPercent = todaysMeds?.length ? (takenMeds.length / todaysMeds.length) * 100 : 0;

  if (loadingSummary || loadingMeds || loadingAppointments) {
    return <div className="p-8 flex justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">Here's your health summary for today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {!isDoctor && !isPharmacy && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Medication Adherence</CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.medicationsTakenToday || 0}/{summary?.medicationsToday || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Doses taken today</p>
              <Progress value={progressPercent} className="mt-3" />
            </CardContent>
          </Card>
        )}
        
        {!isPharmacy && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.upcomingAppointments || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{isDoctor ? "Patients scheduled" : "Upcoming scheduled"}</p>
            </CardContent>
          </Card>
        )}
        
        {!isDoctor && !isPharmacy && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Active Medications</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.activeMedications || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Current prescriptions</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Community Groups</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.familyMembers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Support groups joined</p>
              </CardContent>
            </Card>

            {(user as any)?.deviceId && (
              <Card className="bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Bracelet Vitals</CardTitle>
                  <Heart className="h-4 w-4 text-red-500 animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1">
                    <div className="text-2xl font-bold">{latestReading?.heartRate || "--"}</div>
                    <span className="text-xs text-muted-foreground">BPM</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] h-4 py-0 px-1 border-blue-200 text-blue-700">
                      {latestReading?.spo2 || "--"}% SpO2
                    </Badge>
                    <Badge variant="outline" className="text-[10px] h-4 py-0 px-1 border-emerald-200 text-emerald-700">
                      {latestReading?.steps || 0} steps
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {isDoctor && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Patient Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalRecords || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Records shared with you</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Existing columns */}
        <div className="md:col-span-1 lg:col-span-1">
          {!isDoctor && !isPharmacy && (
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Today's Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todaysMeds && todaysMeds.length > 0 ? (
                  <div className="space-y-4">
                    {todaysMeds.map((med) => (
                      <div key={med.id} className={`flex items-center justify-between p-3 border rounded-lg ${med.taken ? 'bg-muted/50 border-border/50' : 'bg-card border-border'}`}>
                        <div className="flex flex-col">
                          <span className={`font-medium ${med.taken ? 'text-muted-foreground line-through' : ''}`}>
                            {med.medicationName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {med.dosage} • {med.scheduledTime}
                          </span>
                        </div>
                        {med.taken ? (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Taken</span>
                        ) : (
                          <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">Pending</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
                    <Pill className="h-8 w-8 mb-2 opacity-20" />
                    <p>No medications scheduled.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-1 lg:col-span-1">
          {!isPharmacy && (
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Upcoming Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appointments && appointments.length > 0 ? (
                  <div className="space-y-4">
                    {appointments.slice(0, 3).map((apt) => (
                      <div key={apt.id} className="flex items-start gap-4 p-3 border border-border rounded-lg bg-card">
                        <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-md p-1.5 min-w-12 text-center">
                          <span className="text-[10px] font-semibold uppercase">{format(parseISO(apt.appointmentDate), 'MMM')}</span>
                          <span className="text-base font-bold">{format(parseISO(apt.appointmentDate), 'd')}</span>
                        </div>
                        <div className="flex flex-col flex-1 truncate">
                          <span className="font-medium truncate">Dr. {apt.doctorName}</span>
                          <span className="text-xs text-muted-foreground">{apt.appointmentTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
                    <Calendar className="h-8 w-8 mb-2 opacity-20" />
                    <p>No appointments.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* New Bracelet Live Monitor Card */}
        {(user as any)?.deviceId && (
          <div className="md:col-span-2 lg:col-span-1">
            <Card className="h-full border-primary/20 bg-gradient-to-br from-background to-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bluetooth className="h-5 w-5 text-primary" />
                    Bracelet Monitor
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 animate-pulse">Live</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-around items-center py-2">
                  <div className="flex flex-col items-center">
                    <Heart className="h-8 w-8 text-red-500 mb-1" />
                    <span className="text-2xl font-bold">{latestReading?.heartRate || "--"}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">BPM</span>
                  </div>
                  <div className="h-10 w-px bg-border" />
                  <div className="flex flex-col items-center">
                    <Wind className="h-8 w-8 text-blue-500 mb-1" />
                    <span className="text-2xl font-bold">{latestReading?.spo2 || "--"}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">% SpO2</span>
                  </div>
                </div>

                <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Footprints className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium">Daily Steps</span>
                    </div>
                    <span className="text-sm font-bold">{latestReading?.steps || 0} / 10,000</span>
                  </div>
                  <Progress value={Math.min(((latestReading?.steps || 0) / 10000) * 100, 100)} className="h-2" />
                  <p className="text-[10px] text-muted-foreground mt-2 text-center uppercase tracking-wider font-semibold">
                    Activity: <span className="text-primary">{latestReading?.activity || "Unknown"}</span>
                  </p>
                </div>

                <div className="text-[10px] text-center text-muted-foreground italic">
                  Last updated: {latestReading ? format(new Date(latestReading.timestamp), 'HH:mm:ss') : "Never"}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
