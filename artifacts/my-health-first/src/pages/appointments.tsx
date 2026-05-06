import { useListAppointments, useDeleteAppointment, useUpdateAppointment, getListAppointmentsQueryKey, useListFamilyMembers } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Video, CheckCircle, XCircle, Hourglass, Users, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isFuture } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function statusConfig(status: string) {
  const map: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700", icon: Hourglass },
    completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
  };
  return map[status] ?? map.scheduled;
}

type Appt = {
  id: number;
  doctorName: string;
  doctorSpecialty: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes?: string | null;
  isOnline: boolean;
  familyMemberId?: number | null;
  familyMemberName?: string | null;
};

export default function Appointments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: appointments, isLoading } = useListAppointments();
  const { data: familyMembers } = useListFamilyMembers();
  const deleteAppointment = useDeleteAppointment();
  const updateAppointment = useUpdateAppointment();

  const upcoming = (appointments ?? []).filter(a => a.status === "scheduled" && isFuture(parseISO(a.appointmentDate + "T" + a.appointmentTime)));
  const past = (appointments ?? []).filter(a => a.status !== "scheduled" || !isFuture(parseISO(a.appointmentDate + "T" + a.appointmentTime)));

  function handleCancel(id: number) {
    updateAppointment.mutate(
      { id, data: { status: "cancelled" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          toast({ title: "Appointment cancelled" });
        },
        onError: () => toast({ title: "Failed to cancel", variant: "destructive" }),
      }
    );
  }

  function handleComplete(id: number) {
    updateAppointment.mutate(
      { id, data: { status: "completed" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          toast({ title: "Appointment marked as completed" });
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      }
    );
  }

  function AppointmentCard({ appt }: { appt: Appt }) {
    const cfg = statusConfig(appt.status);
    const Icon = cfg.icon;
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-lg p-3 min-w-16 text-center shrink-0">
              <span className="text-xs font-semibold uppercase">{format(parseISO(appt.appointmentDate), "MMM")}</span>
              <span className="text-2xl font-bold leading-none mt-0.5">{format(parseISO(appt.appointmentDate), "d")}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">Dr. {appt.doctorName}</p>
                  <p className="text-sm text-muted-foreground">{appt.doctorSpecialty}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.color}`}>
                  <Icon className="h-3 w-3" />{cfg.label}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{appt.appointmentTime}</span>
                {appt.isOnline && <span className="flex items-center gap-1 text-blue-600"><Video className="h-3.5 w-3.5" />Online</span>}
                {appt.familyMemberName && (
                  <Badge variant="secondary" className="text-xs gap-1 py-0">
                    <Users className="h-3 w-3" />{appt.familyMemberName}
                  </Badge>
                )}
              </div>
              {appt.notes && <p className="text-sm text-muted-foreground mt-2 italic">"{appt.notes}"</p>}
              {appt.status === "scheduled" && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="text-green-700 border-green-200 hover:bg-green-50" onClick={() => handleComplete(appt.id)}>Mark Done</Button>
                  <Button size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-50" onClick={() => handleCancel(appt.id)}>Cancel</Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group appointments by family member for the Family tab
  const myAppts = (appointments ?? []).filter(a => !a.familyMemberId);
  const familyApptMap = new Map<number, typeof appointments>();
  (appointments ?? []).filter(a => a.familyMemberId).forEach(a => {
    const id = a.familyMemberId!;
    if (!familyApptMap.has(id)) familyApptMap.set(id, []);
    familyApptMap.get(id)!.push(a);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground mt-1">Manage doctor visits for you and your family.</p>
        </div>
        <Badge variant="outline" className="text-sm">{upcoming.length} upcoming</Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading appointments...</div>
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
            <TabsTrigger value="family" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />Family
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4 mt-4">
            {upcoming.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center text-muted-foreground">
                <Calendar className="h-12 w-12 mb-3 opacity-20" />
                <p className="font-medium">No upcoming appointments</p>
                <p className="text-sm mt-1">Go to Doctors to book your next visit.</p>
              </div>
            ) : upcoming.map(a => <AppointmentCard key={a.id} appt={a} />)}
          </TabsContent>

          <TabsContent value="past" className="space-y-4 mt-4">
            {past.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">No past appointments yet.</div>
            ) : past.map(a => <AppointmentCard key={a.id} appt={a} />)}
          </TabsContent>

          <TabsContent value="family" className="mt-4 space-y-8">
            {/* My appointments */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <UserRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">My Appointments</p>
                  <p className="text-xs text-muted-foreground">{myAppts.length} total</p>
                </div>
              </div>
              {myAppts.length === 0 ? (
                <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-4">No personal appointments yet.</div>
              ) : (
                <div className="space-y-3">
                  {myAppts.map(a => <AppointmentCard key={a.id} appt={a} />)}
                </div>
              )}
            </div>

            {/* Each family member */}
            {(familyMembers ?? []).map(member => {
              const appts = familyApptMap.get(member.id) ?? [];
              const memberUpcoming = appts.filter(a => a.status === "scheduled" && isFuture(parseISO(a.appointmentDate + "T" + a.appointmentTime)));
              return (
                <div key={member.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{member.name}</p>
                        {memberUpcoming.length > 0 && (
                          <Badge className="text-xs py-0 h-5">{memberUpcoming.length} upcoming</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{member.relationship} · {appts.length} appointment{appts.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  {appts.length === 0 ? (
                    <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-4">No appointments for {member.name} yet. Book from the Doctors page.</div>
                  ) : (
                    <div className="space-y-3">
                      {appts.map(a => <AppointmentCard key={a.id} appt={a} />)}
                    </div>
                  )}
                </div>
              );
            })}

            {(familyMembers ?? []).length === 0 && familyApptMap.size === 0 && (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">No family members yet</p>
                <p className="text-sm mt-1">Add family members from the Family page, then book appointments for them from the Doctors page.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
