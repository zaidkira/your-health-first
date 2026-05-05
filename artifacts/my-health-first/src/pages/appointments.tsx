import { useListAppointments, useDeleteAppointment, useUpdateAppointment, getListAppointmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Video, CheckCircle, XCircle, Hourglass } from "lucide-react";
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

export default function Appointments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: appointments, isLoading } = useListAppointments();
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

  function AppointmentCard({ appt }: { appt: typeof upcoming[number] }) {
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
                <div>
                  <p className="font-semibold">Dr. {appt.doctorName}</p>
                  <p className="text-sm text-muted-foreground">{appt.doctorSpecialty}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                  <Icon className="h-3 w-3" />{cfg.label}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{appt.appointmentTime}</span>
                {appt.isOnline && <span className="flex items-center gap-1 text-blue-600"><Video className="h-3.5 w-3.5" />Online</span>}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground mt-1">Manage your scheduled doctor visits.</p>
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
        </Tabs>
      )}
    </div>
  );
}
