import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMedications,
  getListMedicationsQueryKey,
  useCreateMedication,
  useDeleteMedication,
  useGetTodaysMedications,
  getGetTodaysMedicationsQueryKey,
  useMarkMedicationTaken,
  useListFamilyMembers,
} from "@workspace/api-client-react";
import { Pill, Plus, Check, Calendar, Clock, Trash2, Users, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const medicationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  times: z.string().min(1, "Times are required (e.g. 08:00|20:00)"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  notes: z.string().optional(),
  familyMemberId: z.coerce.number().optional().nullable(),
});

type MedicationFormValues = z.infer<typeof medicationSchema>;

const FREQUENCIES = ["Daily", "Twice a day", "Three times a day", "Weekly", "As needed"];

const TIME_PRESETS: Record<string, string> = {
  "Daily": "08:00",
  "Twice a day": "08:00|20:00",
  "Three times a day": "08:00|14:00|20:00",
  "Weekly": "08:00",
  "As needed": "08:00",
};

export default function Medications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [memberFilter, setMemberFilter] = useState<string>("all");

  const { data: medications, isLoading: loadingMeds } = useListMedications();
  const { data: todaysMeds, isLoading: loadingTodays } = useGetTodaysMedications();
  const { data: familyMembers } = useListFamilyMembers();

  const createMutation = useCreateMedication();
  const deleteMutation = useDeleteMedication();
  const markTakenMutation = useMarkMedicationTaken();

  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      name: "",
      dosage: "",
      frequency: "Daily",
      times: "08:00",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      notes: "",
      familyMemberId: null,
    },
  });

  function getMemberName(familyMemberId: number | null | undefined): string | null {
    if (!familyMemberId) return null;
    return familyMembers?.find(fm => fm.id === familyMemberId)?.name ?? null;
  }

  const onSubmit = (data: MedicationFormValues) => {
    createMutation.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMedicationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTodaysMedicationsQueryKey() });
        setIsAddOpen(false);
        form.reset();
        toast({ title: "Medication added successfully" });
      },
      onError: (err: any) => {
        toast({ title: "Failed to add medication", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this medication?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMedicationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTodaysMedicationsQueryKey() });
          toast({ title: "Medication deleted" });
        }
      });
    }
  };

  const handleMarkTaken = (id: number) => {
    markTakenMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTodaysMedicationsQueryKey() });
        toast({ title: "Marked as taken" });
      }
    });
  };

  // Group medications by family member for the Family tab
  const myMeds = (medications ?? []).filter(m => !m.familyMemberId);
  const familyMedMap = new Map<number, typeof medications>();
  (medications ?? []).filter(m => m.familyMemberId).forEach(m => {
    const id = m.familyMemberId!;
    if (!familyMedMap.has(id)) familyMedMap.set(id, []);
    familyMedMap.get(id)!.push(m);
  });

  // Filter today's meds by member
  const filteredTodaysMeds = memberFilter === "all"
    ? (todaysMeds ?? [])
    : memberFilter === "me"
      ? (todaysMeds ?? []).filter(m => !m.familyMemberName)
      : (todaysMeds ?? []).filter(m => m.familyMemberName === memberFilter);

  const todaysMemberNames = Array.from(new Set((todaysMeds ?? []).map(m => m.familyMemberName).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medications</h1>
          <p className="text-muted-foreground mt-1">Manage prescriptions and daily schedules for you and your family.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Medication</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Medication</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Medication Name</FormLabel><FormControl><Input placeholder="e.g. Amoxicillin" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="dosage" render={({ field }) => (
                    <FormItem><FormLabel>Dosage</FormLabel><FormControl><Input placeholder="e.g. 500mg" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="frequency" render={({ field }) => (
                    <FormItem><FormLabel>Frequency</FormLabel>
                      <Select onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue("times", TIME_PRESETS[val] ?? "08:00");
                      }} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="times" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Times</FormLabel>
                    <FormControl><Input placeholder="08:00|14:00|20:00" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">Separate multiple times with | (pipe)</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem><FormLabel>End Date (optional)</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="familyMemberId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>For Who?</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "myself" ? null : Number(val))} value={field.value ? String(field.value) : "myself"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="myself">Myself</SelectItem>
                        {(familyMembers ?? []).map(fm => (
                          <SelectItem key={fm.id} value={String(fm.id)}>{fm.name} ({fm.relationship})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes (optional)</FormLabel><FormControl><Input placeholder="Any extra instructions..." {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : "Save Medication"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today's Schedule</TabsTrigger>
          <TabsTrigger value="all">All Medications</TabsTrigger>
          <TabsTrigger value="family" className="gap-1.5"><Users className="h-3.5 w-3.5" />Family</TabsTrigger>
        </TabsList>

        {/* Today's Schedule Tab */}
        <TabsContent value="today" className="mt-4 space-y-4">
          {/* Member filter chips */}
          {todaysMemberNames.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant={memberFilter === "all" ? "default" : "outline"} onClick={() => setMemberFilter("all")}>Everyone</Button>
              <Button size="sm" variant={memberFilter === "me" ? "default" : "outline"} onClick={() => setMemberFilter("me")}>
                <UserRound className="h-3.5 w-3.5 mr-1" />Me
              </Button>
              {todaysMemberNames.map(name => (
                <Button key={name} size="sm" variant={memberFilter === name ? "default" : "outline"} onClick={() => setMemberFilter(name)}>
                  {name}
                </Button>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                {memberFilter === "all" ? "Schedule for Today" : memberFilter === "me" ? "My Schedule Today" : `${memberFilter}'s Schedule Today`}
              </CardTitle>
              <CardDescription>Mark medications as taken when done.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTodays ? (
                <div className="text-center py-4 text-muted-foreground">Loading schedule...</div>
              ) : filteredTodaysMeds.length > 0 ? (
                <div className="space-y-3">
                  {filteredTodaysMeds.map((med) => (
                    <div key={med.id} className={`flex items-center justify-between p-4 border rounded-xl ${med.taken ? "bg-muted/50 border-border/50" : "bg-card border-border shadow-sm"}`}>
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`p-3 rounded-full shrink-0 ${med.taken ? "bg-primary/10 text-primary/40" : "bg-primary/10 text-primary"}`}>
                          <Clock className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className={`font-semibold truncate ${med.taken ? "text-muted-foreground line-through" : ""}`}>{med.medicationName}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-sm text-muted-foreground">{med.dosage}</span>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="text-sm font-medium text-primary">{med.scheduledTime}</span>
                            {med.familyMemberName && (
                              <>
                                <span className="text-muted-foreground/50">•</span>
                                <Badge variant="secondary" className="text-xs py-0">{med.familyMemberName}</Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 ml-3">
                        {med.taken ? (
                          <div className="flex items-center text-sm font-medium text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-full whitespace-nowrap">
                            <Check className="h-4 w-4 mr-1" />Taken
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground whitespace-nowrap"
                            onClick={() => handleMarkTaken(med.id)}
                            disabled={markTakenMutation.isPending}
                          >
                            Mark Taken
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                  <Pill className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No medications scheduled for today.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Medications Tab */}
        <TabsContent value="all" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loadingMeds ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">Loading...</div>
            ) : (medications ?? []).length > 0 ? (
              (medications ?? []).map((med) => {
                const memberName = getMemberName(med.familyMemberId);
                return (
                  <Card key={med.id} className={!med.isActive ? "opacity-60" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{med.name}</CardTitle>
                          <CardDescription className="mt-0.5">{med.dosage} · {med.frequency}</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" onClick={() => handleDelete(med.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {memberName ? (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Users className="h-3 w-3" />{memberName}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                          <UserRound className="h-3 w-3" />Myself
                        </Badge>
                      )}
                      <div className="text-sm space-y-1.5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{med.times.split("|").join(", ")}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>From {med.startDate}{med.endDate ? ` → ${med.endDate}` : ""}</span>
                        </div>
                        {med.notes && (
                          <div className="mt-1 text-xs bg-muted p-2 rounded-md">{med.notes}</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                <Pill className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No medications found. Add your first one above.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Family Tab */}
        <TabsContent value="family" className="mt-4 space-y-6">
          {/* My own medications */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <UserRound className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">My Medications</p>
                <p className="text-xs text-muted-foreground">{myMeds.length} medication{myMeds.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            {myMeds.length === 0 ? (
              <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-4">No personal medications added yet.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {myMeds.map(med => (
                  <FamilyMedCard key={med.id} med={med} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>

          {/* Each family member's medications */}
          {(familyMembers ?? []).map(member => {
            const meds = familyMedMap.get(member.id) ?? [];
            return (
              <div key={member.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.relationship} · {meds.length} medication{meds.length !== 1 ? "s" : ""}</p>
                  </div>
                  <Button size="sm" variant="outline" className="ml-auto gap-1" onClick={() => {
                    form.reset({ ...form.getValues(), familyMemberId: member.id, name: "", dosage: "" });
                    setIsAddOpen(true);
                  }}>
                    <Plus className="h-3.5 w-3.5" />Add
                  </Button>
                </div>
                {meds.length === 0 ? (
                  <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-4">No medications added for {member.name} yet.</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {meds.map(med => (
                      <FamilyMedCard key={med.id} med={med} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {(familyMembers ?? []).length === 0 && familyMedMap.size === 0 && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">No family members yet</p>
              <p className="text-sm mt-1">Add family members from the Family page, then assign medications to them.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FamilyMedCard({ med, onDelete }: { med: any; onDelete: (id: number) => void }) {
  return (
    <Card className={`${!med.isActive ? "opacity-60" : ""}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{med.name}</p>
            <p className="text-xs text-muted-foreground">{med.dosage} · {med.frequency}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0 -mt-0.5" onClick={() => onDelete(med.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />{med.times.split("|").join(", ")}
        </div>
        {med.notes && <p className="text-xs text-muted-foreground italic">{med.notes}</p>}
      </CardContent>
    </Card>
  );
}
