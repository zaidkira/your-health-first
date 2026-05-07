import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRegister } from "@workspace/api-client-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill, UserRound, Stethoscope, Store, Check, MapPin, Clock, CreditCard, Wifi } from "lucide-react";
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

const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, "0")}:00`
);

type Role = "patient" | "doctor" | "pharmacy";

const ROLES: { value: Role; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "patient",  label: "Patient",  description: "Manage health, medications & appointments", icon: UserRound  },
  { value: "doctor",   label: "Doctor",   description: "Provide consultations & manage patients",   icon: Stethoscope },
  { value: "pharmacy", label: "Pharmacy", description: "List medicines & help patients find stock",  icon: Store       },
];

const registerSchema = z.object({
  name:     z.string().min(2, "Name must be at least 2 characters"),
  email:    z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone:    z.string().min(1, "Phone number is required"),
  wilaya:   z.string().min(1, "Wilaya is required"),
  role:     z.enum(["patient", "doctor", "pharmacy"]),
  // Doctor fields
  doctorSpecialty:         z.string().optional(),
  doctorAddress:           z.string().optional(),
  doctorAvailableDays:     z.string().optional(),
  doctorOpenTime:          z.string().optional(),
  doctorCloseTime:         z.string().optional(),
  doctorFee:               z.coerce.number().optional(),
  doctorOnline:            z.boolean().optional(),
  // Pharmacy fields
  pharmacyAddress:         z.string().optional(),
  pharmacyIs24h:           z.boolean().optional(),
  pharmacyOpenTime:        z.string().optional(),
  pharmacyCloseTime:       z.string().optional(),
}).refine((data) => {
  if (data.role === "doctor") {
    return !!data.doctorSpecialty && !!data.doctorAddress && !!data.doctorFee;
  }
  return true;
}, {
  message: "Doctor specialty, address and fee are required",
  path: ["doctorSpecialty"],
}).refine((data) => {
  if (data.role === "pharmacy") {
    return !!data.pharmacyAddress;
  }
  return true;
}, {
  message: "Pharmacy address is required",
  path: ["pharmacyAddress"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { login: setAuth } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegister();
  const [selectedRole, setSelectedRole] = useState<Role>("patient");

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "", email: "", password: "", phone: "", wilaya: "",
      role: "patient",
      doctorSpecialty: "", doctorAddress: "", doctorAvailableDays: "Mon-Fri",
      doctorOpenTime: "08:00", doctorCloseTime: "17:00",
      doctorFee: undefined, doctorOnline: false,
      pharmacyAddress: "", pharmacyIs24h: false,
      pharmacyOpenTime: "08:00", pharmacyCloseTime: "21:00",
    },
  });

  function handleRoleSelect(role: Role) {
    setSelectedRole(role);
    form.setValue("role", role);
  }

  function onSubmit(data: RegisterFormValues) {
    const payload: any = {
      name: data.name, email: data.email, password: data.password,
      phone: data.phone || null, wilaya: data.wilaya, role: data.role,
    };

    if (data.role === "doctor") {
      payload.doctorProfile = {
        specialty: data.doctorSpecialty || "",
        address: data.doctorAddress || "",
        availableDays: data.doctorAvailableDays || "Mon-Fri",
        availableHours: `${data.doctorOpenTime || "08:00"} - ${data.doctorCloseTime || "17:00"}`,
        consultationFee: Number(data.doctorFee) || 2000,
        isOnlineConsultation: !!data.doctorOnline,
      };
    }

    if (data.role === "pharmacy") {
      payload.pharmacyProfile = {
        address: data.pharmacyAddress || "",
        is24h: !!data.pharmacyIs24h,
        openTime: data.pharmacyIs24h ? "00:00" : (data.pharmacyOpenTime || "08:00"),
        closeTime: data.pharmacyIs24h ? "23:59" : (data.pharmacyCloseTime || "21:00"),
      };
    }

    registerMutation.mutate({ data: payload }, {
      onSuccess: (res) => {
        setAuth(res.token, res.user);
        setLocation("/dashboard");
      },
      onError: (error: any) => {
        const detail = error.response?.data?.detail || error.response?.data?.error;
        toast({
          title: "Registration Failed",
          description: detail || error.message || "Could not create account",
          variant: "destructive",
        });
      }
    });
  }

  const isDoctor   = selectedRole === "doctor";
  const isPharmacy = selectedRole === "pharmacy";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-sm p-8 my-8">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <Pill className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-muted-foreground text-sm mt-1">Join My Health First</p>
        </div>

        {/* Role selector */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-3">I am a…</p>
          <div className="grid grid-cols-3 gap-3">
            {ROLES.map(({ value, label, description, icon: Icon }) => {
              const active = selectedRole === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRoleSelect(value)}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all focus:outline-none ${
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  {active && (
                    <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 hidden sm:block">{description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* ── Common fields ── */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {isDoctor ? "Full Name & Title" : isPharmacy ? "Pharmacy Name" : "Full Name"}
                </FormLabel>
                <FormControl>
                  <Input placeholder={isDoctor ? "Dr. Ahmed Benali" : isPharmacy ? "Pharmacie Centrale" : "Ahmed Benali"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input placeholder="you@example.com" type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl><Input placeholder="••••••••" type="password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone {!isDoctor && !isPharmacy && "(Optional)"}</FormLabel>
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

            {/* ── Doctor-specific fields ── */}
            {isDoctor && (
              <div className="space-y-4 pt-2 border-t border-border">
                <p className="text-sm font-semibold text-primary flex items-center gap-2 pt-1">
                  <Stethoscope className="h-4 w-4" /> Doctor Information
                </p>

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
                    <div className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${field.value ? "border-primary bg-primary/5" : "border-border"}`}
                      onClick={() => field.onChange(!field.value)}>
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
              </div>
            )}

            {/* ── Pharmacy-specific fields ── */}
            {isPharmacy && (
              <div className="space-y-4 pt-2 border-t border-border">
                <p className="text-sm font-semibold text-primary flex items-center gap-2 pt-1">
                  <Store className="h-4 w-4" /> Pharmacy Information
                </p>

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
                    <div className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${field.value ? "border-primary bg-primary/5" : "border-border"}`}
                      onClick={() => field.onChange(!field.value)}>
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
              </div>
            )}

            <Button type="submit" className="w-full !mt-6" disabled={registerMutation.isPending}>
              {registerMutation.isPending
                ? "Creating account..."
                : `Register as ${ROLES.find(r => r.value === selectedRole)?.label}`}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link href="/login">
            <span className="text-primary font-medium hover:underline cursor-pointer">Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
