import { useState } from "react";
import { useListDoctors, useCreateAppointment, getListAppointmentsQueryKey, useListFamilyMembers } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Star, Phone, MapPin, Clock, Video, CalendarPlus, Search, Stethoscope, Wifi, TrendingUp, Users, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapView } from "@/components/MapView";
import { Map as MapIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const WILAYAS = ["Algiers", "Oran", "Constantine", "Annaba", "Blida", "Setif", "Tizi Ouzou", "Batna"];
const SPECIALTIES = ["General Practitioner", "Cardiologist", "Dermatologist", "Pediatrician", "Neurologist", "Orthopedist", "Ophthalmologist", "Gynecologist"];

export default function Doctors() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [specialty, setSpecialty] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [search, setSearch] = useState("");
  const [bookingDoctor, setBookingDoctor] = useState<null | { id: number; name: string; specialty: string }>(null);
  const [booking, setBooking] = useState({ date: "", time: "09:00", isOnline: false, notes: "", familyMemberId: "" });

  const { data: allDoctors } = useListDoctors({}, { query: { queryKey: ["doctors-all"] as any } });
  const { data: doctors, isLoading } = useListDoctors(
    { specialty: specialty && specialty !== "all" ? specialty : undefined, wilaya: wilaya && wilaya !== "all" ? wilaya : undefined },
    { query: { queryKey: ["doctors", specialty, wilaya] as any } }
  );
  const { data: familyMembers } = useListFamilyMembers();
  const createAppointment = useCreateAppointment();

  const filtered = (doctors ?? []).filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase())
  );

  const all = allDoctors ?? [];
  const totalDoctors = all.length;
  const onlineCount = all.filter(d => d.isOnlineConsultation).length;
  const avgRating = all.length > 0 ? (all.reduce((s, d) => s + d.rating, 0) / all.length).toFixed(1) : "—";
  const specialtyCounts = all.reduce<Record<string, number>>((acc, d) => {
    acc[d.specialty] = (acc[d.specialty] ?? 0) + 1;
    return acc;
  }, {});
  const topSpecialty = Object.entries(specialtyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingDoctor) return;
    createAppointment.mutate(
      {
        data: {
          doctorId: bookingDoctor.id,
          appointmentDate: booking.date,
          appointmentTime: booking.time,
          isOnline: booking.isOnline,
          notes: booking.notes || null,
          familyMemberId: booking.familyMemberId && booking.familyMemberId !== "myself" ? Number(booking.familyMemberId) : null,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          setBookingDoctor(null);
          setBooking({ date: "", time: "09:00", isOnline: false, notes: "", familyMemberId: "myself" });
          const memberName = (familyMembers ?? []).find(fm => String(fm.id) === booking.familyMemberId)?.name;
          toast({ title: memberName ? `Appointment booked for ${memberName}` : "Appointment booked successfully" });
        },
        onError: () => toast({ title: "Failed to book appointment", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Find a Doctor</h1>
        <p className="text-muted-foreground mt-1">Browse doctors and book appointments for you or a family member.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDoctors}</p>
              <p className="text-xs text-muted-foreground">Total Doctors</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Wifi className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{onlineCount}</p>
              <p className="text-xs text-muted-foreground">Online Available</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgRating}</p>
              <p className="text-xs text-muted-foreground">Avg. Rating</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">{topSpecialty}</p>
              <p className="text-xs text-muted-foreground">Top Specialty</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Specialty chips */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Browse by Specialty</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSpecialty("all")}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${specialty === "all" || specialty === "" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
          >
            All
          </button>
          {Object.entries(specialtyCounts).sort((a, b) => b[1] - a[1]).map(([sp, count]) => (
            <button
              key={sp}
              onClick={() => setSpecialty(sp === specialty ? "all" : sp)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors flex items-center gap-1.5 ${specialty === sp ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
            >
              {sp}
              <span className={`text-xs rounded-full px-1.5 py-0 ${specialty === sp ? "bg-white/20" : "bg-muted"}`}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or specialty..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={specialty || "all"} onValueChange={setSpecialty}>
          <SelectTrigger className="sm:w-52"><SelectValue placeholder="All Specialties" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialties</SelectItem>
            {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={wilaya || "all"} onValueChange={setWilaya}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="All Wilayas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wilayas</SelectItem>
            {WILAYAS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> doctor{filtered.length !== 1 ? "s" : ""}
          {specialty && <> in <span className="font-semibold text-foreground">{specialty}</span></>}
          {wilaya && <> · <span className="font-semibold text-foreground">{wilaya}</span></>}
        </p>
        </p>
      )}

      <Tabs defaultValue="list" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <Users className="h-4 w-4" /> List View
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <MapIcon className="h-4 w-4" /> Map View
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="mt-0">
          {/* Doctor cards */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading doctors...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No doctors found matching your criteria.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map(doctor => (
                <Card key={doctor.id} className="hover:shadow-md transition-shadow group">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0 group-hover:bg-primary/20 transition-colors">
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
        </TabsContent>

        <TabsContent value="map" className="mt-0">
          <Card>
            <CardContent className="p-0">
              <MapView 
                points={filtered.map(d => ({
                  id: d.id,
                  lat: (d as any).lat,
                  lng: (d as any).lng,
                  title: `Dr. ${d.name}`,
                  subtitle: d.specialty,
                  details: `${d.address}, ${d.wilaya}`,
                  actionLabel: "Book Appointment",
                  onAction: () => setBookingDoctor({ id: d.id, name: d.name, specialty: d.specialty })
                }))}
                className="h-[600px] w-full rounded-md"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Booking dialog */}
      <Dialog open={!!bookingDoctor} onOpenChange={v => !v && setBookingDoctor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
          </DialogHeader>
          {bookingDoctor && (
            <form onSubmit={handleBook} className="space-y-4 mt-2">
              {/* Doctor summary */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                  {bookingDoctor.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm">Dr. {bookingDoctor.name}</p>
                  <p className="text-xs text-muted-foreground">{bookingDoctor.specialty}</p>
                </div>
              </div>

              {/* Who is this for */}
              <div className="space-y-1">
                <Label>Who is this appointment for?</Label>
                <Select value={booking.familyMemberId} onValueChange={v => setBooking(b => ({ ...b, familyMemberId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="myself">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                        Myself
                      </div>
                    </SelectItem>
                    {(familyMembers ?? []).map(fm => (
                      <SelectItem key={fm.id} value={String(fm.id)}>
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {fm.name} ({fm.relationship})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" min={new Date().toISOString().split("T")[0]} value={booking.date} onChange={e => setBooking(b => ({ ...b, date: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Time</Label>
                  <Input type="time" value={booking.time} onChange={e => setBooking(b => ({ ...b, time: e.target.value }))} required />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="isOnline" checked={booking.isOnline} onChange={e => setBooking(b => ({ ...b, isOnline: e.target.checked }))} className="h-4 w-4 rounded" />
                <Label htmlFor="isOnline">Online consultation</Label>
              </div>

              <div className="space-y-1">
                <Label>Notes (optional)</Label>
                <Input placeholder="Reason for visit, symptoms..." value={booking.notes} onChange={e => setBooking(b => ({ ...b, notes: e.target.value }))} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setBookingDoctor(null)}>Cancel</Button>
                <Button type="submit" disabled={createAppointment.isPending}>
                  {createAppointment.isPending ? "Booking..." : "Confirm Booking"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
