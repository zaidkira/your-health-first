import { useState } from "react";
import { useListDoctors, useCreateAppointment, getListAppointmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Star, Phone, MapPin, Clock, Video, CalendarPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const WILAYAS = ["Algiers", "Oran", "Constantine", "Annaba", "Blida", "Setif", "Tizi Ouzou", "Batna"];
const SPECIALTIES = ["General Practitioner", "Cardiologist", "Dermatologist", "Pediatrician", "Neurologist", "Orthopedist", "Ophthalmologist", "Gynecologist"];

export default function Doctors() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [specialty, setSpecialty] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [search, setSearch] = useState("");
  const [bookingDoctor, setBookingDoctor] = useState<null | { id: number; name: string; specialty: string }>(null);
  const [booking, setBooking] = useState({ date: "", time: "09:00", isOnline: false, notes: "" });

  const { data: doctors, isLoading } = useListDoctors(
    { specialty: specialty || undefined, wilaya: wilaya || undefined },
    { query: { queryKey: ["doctors", specialty, wilaya] as any } }
  );
  const createAppointment = useCreateAppointment();

  const filtered = (doctors ?? []).filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase())
  );

  function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingDoctor) return;
    createAppointment.mutate(
      { data: { doctorId: bookingDoctor.id, appointmentDate: booking.date, appointmentTime: booking.time, isOnline: booking.isOnline, notes: booking.notes || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          setBookingDoctor(null);
          setBooking({ date: "", time: "09:00", isOnline: false, notes: "" });
          toast({ title: "Appointment booked successfully" });
        },
        onError: () => toast({ title: "Failed to book appointment", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Find a Doctor</h1>
        <p className="text-muted-foreground mt-1">Browse doctors and book appointments online.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or specialty..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={specialty} onValueChange={setSpecialty}>
          <SelectTrigger className="sm:w-52"><SelectValue placeholder="All Specialties" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Specialties</SelectItem>
            {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={wilaya} onValueChange={setWilaya}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="All Wilayas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Wilayas</SelectItem>
            {WILAYAS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading doctors...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No doctors found matching your criteria.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(doctor => (
            <Card key={doctor.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                    {doctor.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">Dr. {doctor.name}</p>
                    <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-medium">{doctor.rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({doctor.reviewCount} reviews)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{doctor.address}, {doctor.wilaya}</span></div>
                  <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 shrink-0" /><span>{doctor.availableDays}</span></div>
                  {doctor.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" /><span>{doctor.phone}</span></div>}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-primary">{doctor.consultationFee.toLocaleString()} DZD</span>
                    {doctor.isOnlineConsultation && (
                      <Badge variant="secondary" className="ml-2 text-xs gap-1">
                        <Video className="h-3 w-3" />Online
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={() => setBookingDoctor({ id: doctor.id, name: doctor.name, specialty: doctor.specialty })}>
                    <CalendarPlus className="h-3.5 w-3.5" />Book
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!bookingDoctor} onOpenChange={v => !v && setBookingDoctor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
          </DialogHeader>
          {bookingDoctor && (
            <form onSubmit={handleBook} className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">Dr. {bookingDoctor.name} — {bookingDoctor.specialty}</p>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" min={new Date().toISOString().split("T")[0]} value={booking.date} onChange={e => setBooking(b => ({ ...b, date: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Time</Label>
                <Input type="time" value={booking.time} onChange={e => setBooking(b => ({ ...b, time: e.target.value }))} required />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isOnline" checked={booking.isOnline} onChange={e => setBooking(b => ({ ...b, isOnline: e.target.checked }))} className="h-4 w-4" />
                <Label htmlFor="isOnline">Online consultation</Label>
              </div>
              <div className="space-y-1">
                <Label>Notes (optional)</Label>
                <Input placeholder="Reason for visit..." value={booking.notes} onChange={e => setBooking(b => ({ ...b, notes: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setBookingDoctor(null)}>Cancel</Button>
                <Button type="submit" disabled={createAppointment.isPending}>{createAppointment.isPending ? "Booking..." : "Confirm Booking"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
