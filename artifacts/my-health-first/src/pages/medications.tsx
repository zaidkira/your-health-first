import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListMedications, 
  getListMedicationsQueryKey,
  useCreateMedication,
  useUpdateMedication,
  useDeleteMedication,
  useGetTodaysMedications,
  getGetTodaysMedicationsQueryKey,
  useMarkMedicationTaken,
  useListFamilyMembers
} from "@workspace/api-client-react";
import { Pill, Plus, Check, X, Calendar, Clock, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function Medications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);

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
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      notes: "",
      familyMemberId: null,
    },
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medications</h1>
          <p className="text-muted-foreground mt-1">Manage your prescriptions and daily schedule.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Medication
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Medication</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g. Amoxicillin" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="dosage" render={({ field }) => (
                    <FormItem><FormLabel>Dosage</FormLabel><FormControl><Input placeholder="e.g. 500mg" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="frequency" render={({ field }) => (
                    <FormItem><FormLabel>Frequency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Daily">Daily</SelectItem>
                          <SelectItem value="Twice a day">Twice a day</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="As needed">As needed</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="times" render={({ field }) => (
                  <FormItem><FormLabel>Times (pipe-separated)</FormLabel><FormControl><Input placeholder="08:00|20:00" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem><FormLabel>End Date (Optional)</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                {familyMembers && familyMembers.length > 0 && (
                  <FormField control={form.control} name="familyMemberId" render={({ field }) => (
                    <FormItem><FormLabel>For Family Member (Optional)</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val ? Number(val) : null)} value={field.value ? String(field.value) : undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select family member" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="">None (Myself)</SelectItem>
                          {familyMembers.map(fm => (
                            <SelectItem key={fm.id} value={String(fm.id)}>{fm.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                )}
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>Save Medication</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today's Schedule</TabsTrigger>
          <TabsTrigger value="all">All Medications</TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule for Today</CardTitle>
              <CardDescription>Don't forget to take your medications.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTodays ? (
                <div className="text-center py-4 text-muted-foreground">Loading schedule...</div>
              ) : todaysMeds && todaysMeds.length > 0 ? (
                <div className="space-y-4">
                  {todaysMeds.map((med) => (
                    <div key={med.id} className={`flex items-center justify-between p-4 border rounded-xl ${med.taken ? 'bg-muted/50 border-border/50' : 'bg-card border-border shadow-sm'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${med.taken ? 'bg-primary/10 text-primary/50' : 'bg-primary/10 text-primary'}`}>
                          <Clock className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className={`font-semibold ${med.taken ? 'text-muted-foreground line-through' : ''}`}>{med.medicationName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {med.dosage} • {med.scheduledTime} 
                            {med.familyMemberName && ` • For ${med.familyMemberName}`}
                          </p>
                        </div>
                      </div>
                      <div>
                        {med.taken ? (
                          <div className="flex items-center text-sm font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full">
                            <Check className="h-4 w-4 mr-1" /> Taken
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground"
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
        <TabsContent value="all" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loadingMeds ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">Loading medications...</div>
            ) : medications && medications.length > 0 ? (
              medications.map((med) => (
                <Card key={med.id} className={!med.isActive ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{med.name}</CardTitle>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(med.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>{med.dosage} • {med.frequency}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" /> <span>{med.times.split('|').join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" /> <span>From {med.startDate} {med.endDate && `to ${med.endDate}`}</span>
                      </div>
                      {med.notes && (
                        <div className="mt-2 text-xs bg-muted p-2 rounded-md">
                          {med.notes}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                <Pill className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No medications found.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
