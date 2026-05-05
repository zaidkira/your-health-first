import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetProfile, useUpdateProfile } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  UserRound,
  Stethoscope,
  Store,
  MapPin,
  CreditCard,
  Wifi,
  Check,
  Clock,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

function parseHours(availableHours?: string) {
  if (!availableHours) return { open: "08:00", close: "17:00" };
  const parts = availableHours.split(" - ");
  return { open: parts[0] ?? "08:00", close: parts[1] ?? "17:00" };
}

const profileSchema = z.object({
  name:    z.string().min(2, "Name must be at least 2 characters"),
  phone:   z.string().optional(),
  wilaya:  z.string().min(1, "Wilaya is required"),
  // Doctor
  doctorSpecialty:     z.string().optional(),
  doctorAddress:       z.string().optional(),
  doctorAvailableDays: z.string().optional(),
  doctorOpenTime:      z.string().optional(),
  doctorCloseTime:     z.string().optional(),
  doctorFee:           z.coerce.number().optional(),
  doctorOnline:        z.boolean().optional(),
  // Pharmacy
  pharmacyAddress:     z.string().optional(),
  pharmacyIs24h:       z.boolean().optional(),
  pharmacyOpenTime:    z.string().optional(),
  pharmacyCloseTime:   z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user, login: setAuth } = useAuth();
  const { toast } = useToast();
  const { data: profile, isLoading } = useGetProfile();
  const updateMutation = useUpdateProfile();

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "", phone: "", wilaya: "",
      doctorSpecialty: "", doctorAddress: "", doctorAvailableDays: "Mon-Fri",
      doctorOpenTime: "08:00", doctorCloseTime: "17:00",
      doctorFee: undefined, doctorOnline: false,
      pharmacyAddress: "", pharmacyIs24h: false,
      pharmacyOpenTime: "08:00", pharmacyCloseTime: "21:00",
    },
  });

  // Pre-fill form when profile data arrives
  useEffect(() => {
    if (!profile) return;
    const dp = profile.doctorProfile;
    const pp = profile.pharmacyProfile;
    const { open: dOpen, close: dClose } = parseHours(dp?.availableHours);
    form.reset({
      name:   profile.name ?? "",
      phone:  profile.phone ?? "",
      wilaya: profile.wilaya ?? "",
      doctorSpecialty:     dp?.specialty     ?? "",
      doctorAddress:       dp?.address       ?? "",
      doctorAvailableDays: dp?.availableDays ?? "Mon-Fri",
      doctorOpenTime:      dOpen,
      doctorCloseTime:     dClose,
      doctorFee:           dp?.consultationFee ?? undefined,
      doctorOnline:        dp?.isOnlineConsultation ?? false,
      pharmacyAddress:     pp?.address  ?? "",
      pharmacyIs24h:       pp?.is24h    ?? false,
      pharmacyOpenTime:    pp?.openTime  ?? "08:00",
      pharmacyCloseTime:   pp?.closeTime ?? "21:00",
    });
  }, [profile]);

  function onSubmit(data: ProfileForm) {
    const payload: any = {
      name:   data.name,
      phone:  data.phone || null,
      wilaya: data.wilaya,
    };

    if (user?.role === "doctor") {
      payload.doctorProfile = {
        specialty:            data.doctorSpecialty   ?? "",
        address:              data.doctorAddress     ?? "",
        availableDays:        data.doctorAvailableDays ?? "Mon-Fri",
        availableHours:       `${data.doctorOpenTime} - ${data.doctorCloseTime}`,
        consultationFee:      data.doctorFee         ?? 2000,
        isOnlineConsultation: data.doctorOnline      ?? false,
      };
    }

    if (user?.role === "pharmacy") {
      payload.pharmacyProfile = {
        address:   data.pharmacyAddress ?? "",
        is24h:     data.pharmacyIs24h   ?? false,
        openTime:  data.pharmacyIs24h ? "00:00" : (data.pharmacyOpenTime  ?? "08:00"),
        closeTime: data.pharmacyIs24h ? "23:59" : (data.pharmacyCloseTime ?? "21:00"),
      };
    }

    updateMutation.mutate({ data: payload }, {
      onSuccess: (res) => {
        // Refresh the auth user data (name etc) in context
        const token = localStorage.getItem("auth_token") ?? "";
        setAuth(token, {
          id: res.id, name: res.name, email: res.email,
          phone: res.phone ?? null, wilaya: res.wilaya ?? null,
          role: res.role, createdAt: res.createdAt,
        });
        toast({ title: "Profile updated", description: "Your information has been saved." });
      },
      onError: (error: any) => {
        toast({
          title: "Update Failed",
          description: error.message || "Could not save changes",
          variant: "destructive",
        });
      },
    });
  }

  const role = user?.role ?? "patient";
  const isDoctor   = role === "doctor";
  const isPharmacy = role === "pharmacy";

  const roleIcon = isDoctor ? <Stethoscope className="h-5 w-5" /> : isPharmacy ? <Store className="h-5 w-5" /> : <UserRound className="h-5 w-5" />;
  const roleLabel = isDoctor ? "Doctor" : isPharmacy ? "Pharmacy" : "Patient";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
          {user?.name?.[0]?.toUpperCase() ?? "U"}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{user?.name}</h1>
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-0.5">
            {roleIcon}
            <span className="capitalize">{roleLabel}</span>
            {user?.wilaya && <span>· {user.wilaya}</span>}
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="h-4 w-4" /> Personal Information
              </CardTitle>
              <CardDescription>Basic details visible on your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isDoctor ? "Full Name & Title" : isPharmacy ? "Pharmacy Name" : "Full Name"}</FormLabel>
                  <FormControl>
                    <Input placeholder={isDoctor ? "Dr. Ahmed Benali" : isPharmacy ? "Pharmacie Centrale" : "Ahmed Benali"} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
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
                      <SelectContent className="max-h-60">
                        {WILAYAS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Read-only email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Email (cannot be changed)</label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  {user?.email}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Doctor Information */}
          {isDoctor && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Stethoscope className="h-4 w-4" /> Doctor Information
                </CardTitle>
                <CardDescription>Professional details shown to patients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="doctorSpecialty" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialty</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60">
                          {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="doctorFee" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consultation Fee (DZD)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" type="number" placeholder="2000" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="doctorAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clinic / Cabinet Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder="12 Rue Didouche Mourad, Algiers" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-3 gap-3">
                  <FormField control={form.control} name="doctorAvailableDays" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Working Days</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DAY_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="doctorOpenTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opens At</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-52">
                          {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="doctorCloseTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Closes At</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-52">
                          {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="doctorOnline" render={({ field }) => (
                  <FormItem>
                    <div
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${field.value ? "border-primary bg-primary/5" : "border-border"}`}
                      onClick={() => field.onChange(!field.value)}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${field.value ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                        <Wifi className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Online Consultations Available</p>
                        <p className="text-xs text-muted-foreground">Patients can book video or phone consultations</p>
                      </div>
                      {field.value && <Check className="h-4 w-4 text-primary ml-auto" />}
                    </div>
                  </FormItem>
                )} />
              </CardContent>
            </Card>
          )}

          {/* Pharmacy Information */}
          {isPharmacy && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Store className="h-4 w-4" /> Pharmacy Information
                </CardTitle>
                <CardDescription>Details shown to patients searching for medicines</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="pharmacyAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pharmacy Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder="45 Rue des Frères Bouchama, Oran" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="pharmacyIs24h" render={({ field }) => (
                  <FormItem>
                    <div
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${field.value ? "border-primary bg-primary/5" : "border-border"}`}
                      onClick={() => field.onChange(!field.value)}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${field.value ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Open 24 Hours</p>
                        <p className="text-xs text-muted-foreground">Your pharmacy is available around the clock</p>
                      </div>
                      {field.value && <Check className="h-4 w-4 text-primary ml-auto" />}
                    </div>
                  </FormItem>
                )} />

                {!form.watch("pharmacyIs24h") && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="pharmacyOpenTime" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opens At</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-52">
                            {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="pharmacyCloseTime" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Closes At</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-52">
                            {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending} className="px-8">
              {updateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
              ) : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
