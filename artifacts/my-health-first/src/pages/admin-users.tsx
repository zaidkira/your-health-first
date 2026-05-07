import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ShieldCheck,
  Users,
  Pencil,
  Trash2,
  Loader2,
  Search,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const WILAYAS = [
  "Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra","Béchar",
  "Blida","Bouira","Tamanrasset","Tébessa","Tlemcen","Tiaret","Tizi Ouzou","Algiers",
  "Djelfa","Jijel","Sétif","Saïda","Skikda","Sidi Bel Abbès","Annaba","Guelma",
  "Constantine","Médéa","Mostaganem","M'Sila","Mascara","Ouargla","Oran","El Bayadh",
  "Illizi","Bordj Bou Arréridj","Boumerdès","El Tarf","Tindouf","Tissemsilt",
  "El Oued","Khenchela","Souk Ahras","Tipaza","Mila","Aïn Defla","Naâma",
  "Aïn Témouchent","Ghardaïa","Relizane",
];

const SPECIALTIES = [
  "General Practitioner","Cardiologist","Dermatologist","Pediatrician",
  "Neurologist","Orthopedist","Ophthalmologist","Gynecologist","Dentist",
  "Psychiatrist","Radiologist","Endocrinologist","Urologist","ENT Specialist",
];

const DAY_OPTIONS = [
  "Mon-Fri","Mon-Sat","Mon-Sun","Sun-Thu","Sat-Thu","Tue-Sat","Mon-Wed-Fri",
];

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  wilaya?: string | null;
  role: string;
  createdAt: string;
  doctorProfile?: {
    specialty: string;
    address: string;
    availableDays: string;
    availableHours: string;
    consultationFee: number;
    isOnlineConsultation?: boolean;
  };
  pharmacyProfile?: {
    address: string;
    is24h?: boolean;
    openTime?: string;
    closeTime?: string;
  };
}

const editSchema = z.object({
  name: z.string().min(2, "At least 2 characters"),
  phone: z.string().optional(),
  wilaya: z.string().optional(),
  role: z.enum(["patient", "doctor", "pharmacy", "admin"]),
  doctorSpecialty: z.string().optional(),
  doctorAddress: z.string().optional(),
  doctorAvailableDays: z.string().optional(),
  doctorOpenTime: z.string().optional(),
  doctorCloseTime: z.string().optional(),
  doctorFee: z.coerce.number().optional(),
  pharmacyAddress: z.string().optional(),
  pharmacyIs24h: z.boolean().optional(),
  pharmacyOpenTime: z.string().optional(),
  pharmacyCloseTime: z.string().optional(),
});

type EditForm = z.infer<typeof editSchema>;

function parseHours(h?: string) {
  if (!h) return { open: "08:00", close: "17:00" };
  const parts = h.split(" - ");
  return { open: parts[0] ?? "08:00", close: parts[1] ?? "17:00" };
}

function roleBadgeVariant(role: string): "default" | "secondary" | "outline" | "destructive" {
  if (role === "admin")    return "destructive";
  if (role === "doctor")   return "default";
  if (role === "pharmacy") return "secondary";
  return "outline";
}

function useAdminUsers() {
  const { token } = useAuth();
  return useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: !!token,
  });
}

function useAdminUpdateUser() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Update failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

function useAdminDeleteUser() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Delete failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

function EditDialog({
  user,
  open,
  onClose,
}: {
  user: AdminUser;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const mutation = useAdminUpdateUser();
  const dp = user.doctorProfile;
  const pp = user.pharmacyProfile;
  const { open: dOpen, close: dClose } = parseHours(dp?.availableHours);

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: user.name,
      phone: user.phone ?? "",
      wilaya: user.wilaya ?? "",
      role: user.role as any,
      doctorSpecialty: dp?.specialty ?? "",
      doctorAddress: dp?.address ?? "",
      doctorAvailableDays: dp?.availableDays ?? "Mon-Fri",
      doctorOpenTime: dOpen,
      doctorCloseTime: dClose,
      doctorFee: dp?.consultationFee,
      pharmacyAddress: pp?.address ?? "",
      pharmacyIs24h: pp?.is24h ?? false,
      pharmacyOpenTime: pp?.openTime ?? "08:00",
      pharmacyCloseTime: pp?.closeTime ?? "21:00",
    },
  });

  const watchRole = form.watch("role");
  const watchIs24h = form.watch("pharmacyIs24h");

  function onSubmit(data: EditForm) {
    const payload: any = {
      name: data.name,
      phone: data.phone || null,
      wilaya: data.wilaya || null,
      role: data.role,
    };

    if (data.role === "doctor") {
      payload.doctorProfile = {
        specialty: data.doctorSpecialty ?? "",
        address: data.doctorAddress ?? "",
        availableDays: data.doctorAvailableDays ?? "Mon-Fri",
        availableHours: `${data.doctorOpenTime} - ${data.doctorCloseTime}`,
        consultationFee: data.doctorFee ?? 2000,
        isOnlineConsultation: false,
      };
    }

    if (data.role === "pharmacy") {
      payload.pharmacyProfile = {
        address: data.pharmacyAddress ?? "",
        is24h: data.pharmacyIs24h ?? false,
        openTime: data.pharmacyIs24h ? "00:00" : (data.pharmacyOpenTime ?? "08:00"),
        closeTime: data.pharmacyIs24h ? "23:59" : (data.pharmacyCloseTime ?? "21:00"),
      };
    }

    mutation.mutate(
      { id: user.id, data: payload },
      {
        onSuccess: () => {
          toast({ title: "User updated", description: `${data.name}'s profile has been saved.` });
          onClose();
        },
        onError: (err: any) => {
          toast({
            title: "Update failed",
            description: err.message || "Could not save changes",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User — {user.email}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input placeholder="05XX XX XX XX" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="wilaya" render={({ field }) => (
                <FormItem>
                  <FormLabel>Wilaya</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select wilaya" /></SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-52">
                      {WILAYAS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {watchRole === "doctor" && (
              <div className="space-y-3 border rounded-lg p-3">
                <p className="text-sm font-medium text-muted-foreground">Doctor Details</p>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="doctorSpecialty" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialty</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Specialty" /></SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-52">
                          {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="doctorFee" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee (DZD)</FormLabel>
                      <FormControl><Input type="number" placeholder="2000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="doctorAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl><Input placeholder="Clinic address" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-3 gap-2">
                  <FormField control={form.control} name="doctorAvailableDays" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {DAY_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="doctorOpenTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opens</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="max-h-48">
                          {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="doctorCloseTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Closes</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent className="max-h-48">
                          {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
              </div>
            )}

            {watchRole === "pharmacy" && (
              <div className="space-y-3 border rounded-lg p-3">
                <p className="text-sm font-medium text-muted-foreground">Pharmacy Details</p>

                <FormField control={form.control} name="pharmacyAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl><Input placeholder="Pharmacy address" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="pharmacyIs24h" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={e => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Open 24 hours</FormLabel>
                  </FormItem>
                )} />

                {!watchIs24h && (
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="pharmacyOpenTime" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opens At</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent className="max-h-48">
                            {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="pharmacyCloseTime" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Closes At</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent className="max-h-48">
                            {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useAdminUsers();
  const deleteMutation = useAdminDeleteUser();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete user "${name}"? This action cannot be undone.`)) return;
    
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: "User deleted", description: `User ${name} has been removed.` });
      },
      onError: (err: any) => {
        toast({ 
          title: "Delete failed", 
          description: err.message,
          variant: "destructive" 
        });
      }
    });
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
        <ShieldCheck className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm text-muted-foreground">This page is only accessible to administrators.</p>
      </div>
    );
  }

  const filtered = (users ?? []).filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            View and edit all registered users
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Users</CardTitle>
          <CardDescription>{users?.length ?? 0} total users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, email or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Wilaya</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant(u.role)} className="capitalize">
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{u.wilaya ?? "—"}</TableCell>
                      <TableCell className="text-sm">{u.phone ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingUser(u)}
                            title="Edit user"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {u.id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(u.id, u.name)}
                              disabled={deleteMutation.isPending}
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {editingUser && (
        <EditDialog
          user={editingUser}
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}
