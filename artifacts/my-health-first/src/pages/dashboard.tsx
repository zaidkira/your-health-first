import { useGetDashboardSummary, useGetTodaysMedications, useGetUpcomingAppointments } from "@workspace/api-client-react";
import { Pill, Calendar, Activity, Users, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/lib/auth";

export default function Dashboard() {
  const { user } = useAuth();
  const isDoctor = user?.role === "doctor";
  const isPharmacy = user?.role === "pharmacy";
  const isPatient = !isDoctor && !isPharmacy;
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: todaysMeds, isLoading: loadingMeds } = useGetTodaysMedications();
  const { data: appointments, isLoading: loadingAppointments } = useGetUpcomingAppointments();

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

      <div className="grid gap-4 md:grid-cols-2">
        {!isDoctor && !isPharmacy && (
          <Card>
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
                        {med.familyMemberName ? ` • For ${med.familyMemberName}` : ''}
                      </span>
                    </div>
                    {med.taken ? (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                        Taken
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
                <Pill className="h-8 w-8 mb-2 opacity-20" />
                <p>No medications scheduled for today.</p>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {!isPharmacy && (
          <Card>
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
                    <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-md p-2 min-w-16">
                      <span className="text-xs font-semibold uppercase">{format(parseISO(apt.appointmentDate), 'MMM')}</span>
                      <span className="text-lg font-bold">{format(parseISO(apt.appointmentDate), 'd')}</span>
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">Dr. {apt.doctorName}</span>
                      <span className="text-xs text-muted-foreground mb-1">{apt.doctorSpecialty}</span>
                      <div className="flex items-center text-xs text-muted-foreground gap-1">
                        <Clock className="h-3 w-3" />
                        {apt.appointmentTime}
                      </div>
                    </div>
                    {apt.isOnline && (
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                        Online
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
                <Calendar className="h-8 w-8 mb-2 opacity-20" />
                <p>No upcoming appointments.</p>
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
