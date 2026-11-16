import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetProfile, useUpdateProfile } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MapLocationPicker } from "@/components/MapLocationPicker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
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
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

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

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const profileSchema = z.object({
  name:      z.string().min(2, "Name must be at least 2 characters"),
  phone:     z.string().optional(),
  wilaya:    z.string().min(1, "Wilaya is required"),
  bloodType: z.string().optional(),
  avatarUrl: z.string().optional(),
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
  doctorLat:           z.number().optional(),
  doctorLng:           z.number().optional(),
  pharmacyLat:         z.number().optional(),
  pharmacyLng:         z.number().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

async function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.88);
        resolve(compressed);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const { user, token, login: setAuth, updateUser } = useAuth();
  const { toast } = useToast();
  const { data: profile, isLoading } = useGetProfile();
  const updateMutation = useUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "", 
      phone: user?.phone ?? "", 
      wilaya: user?.wilaya ?? "", 
      bloodType: (user as any)?.bloodType ?? "",
      avatarUrl: (user as any)?.avatarUrl ?? "",
      doctorSpecialty:     (user as any)?.doctorProfile?.specialty     ?? "",
      doctorAddress:       (user as any)?.doctorProfile?.address       ?? "",
      doctorAvailableDays: (user as any)?.doctorProfile?.availableDays ?? "Mon-Fri",
      doctorOpenTime:      parseHours((user as any)?.doctorProfile?.availableHours).open,
      doctorCloseTime:     parseHours((user as any)?.doctorProfile?.availableHours).close,
      doctorFee:           (user as any)?.doctorProfile?.consultationFee ?? undefined,
      doctorOnline:        (user as any)?.doctorProfile?.isOnlineConsultation ?? false,
      pharmacyAddress:     (user as any)?.pharmacyProfile?.address ?? "",
      pharmacyIs24h:       (user as any)?.pharmacyProfile?.is24h   ?? false,
      pharmacyOpenTime:    (user as any)?.pharmacyProfile?.openTime  ?? "08:00",
      pharmacyCloseTime:   (user as any)?.pharmacyProfile?.closeTime ?? "21:00",
      doctorLat:           (user as any)?.doctorProfile?.lat ?? undefined,
      doctorLng:           (user as any)?.doctorProfile?.lng ?? undefined,
      pharmacyLat:         (user as any)?.pharmacyProfile?.lat ?? undefined,
      pharmacyLng:         (user as any)?.pharmacyProfile?.lng ?? undefined,
    },
  });

  // Pre-fill form when profile data arrives
  useEffect(() => {
    if (!profile) return;
    const dp = profile.doctorProfile;
    const pp = profile.pharmacyProfile;
    const { open: dOpen, close: dClose } = parseHours(dp?.availableHours);
    if ((profile as any)?.avatarUrl) {
      setAvatarPreview((profile as any).avatarUrl);
    }
    form.reset({
      name:      profile.name ?? user?.name ?? "",
      phone:     profile.phone ?? user?.phone ?? "",
      wilaya:    profile.wilaya ?? user?.wilaya ?? "",
      bloodType: (profile as any).bloodType ?? (user as any)?.bloodType ?? "",
      avatarUrl: (profile as any)?.avatarUrl ?? (user as any)?.avatarUrl ?? "",
      doctorSpecialty:     dp?.specialty     ?? (user as any)?.doctorProfile?.specialty     ?? "",
      doctorAddress:       dp?.address       ?? (user as any)?.doctorProfile?.address       ?? "",
      doctorAvailableDays: dp?.availableDays ?? (user as any)?.doctorProfile?.availableDays ?? "Mon-Fri",
      doctorOpenTime:      dOpen,
      doctorCloseTime:     dClose,
      doctorFee:           dp?.consultationFee ?? (user as any)?.doctorProfile?.consultationFee ?? undefined,
      doctorOnline:        dp?.isOnlineConsultation ?? (user as any)?.doctorProfile?.isOnlineConsultation ?? false,
      pharmacyAddress:     pp?.address  ?? (user as any)?.pharmacyProfile?.address  ?? "",
      pharmacyIs24h:       pp?.is24h    ?? (user as any)?.pharmacyProfile?.is24h    ?? false,
      pharmacyOpenTime:    pp?.openTime  ?? (user as any)?.pharmacyProfile?.openTime  ?? "08:00",
      pharmacyCloseTime:   pp?.closeTime ?? (user as any)?.pharmacyProfile?.closeTime ?? "21:00",
      doctorLat:           dp?.lat ?? (user as any)?.doctorProfile?.lat ?? undefined,
      doctorLng:           dp?.lng ?? (user as any)?.doctorProfile?.lng ?? undefined,
      pharmacyLat:         pp?.lat ?? (user as any)?.pharmacyProfile?.lat ?? undefined,
      pharmacyLng:         pp?.lng ?? (user as any)?.pharmacyProfile?.lng ?? undefined,
    });
  }, [profile, user]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, WebP).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const optimizedDataUrl = await processImageFile(file);
      setAvatarPreview(optimizedDataUrl);
      form.setValue("avatarUrl", optimizedDataUrl);

      // Save directly to the server so it's instantly persisted
      const res = await apiFetch("/api/auth/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: optimizedDataUrl }),
      });

      if (!res.ok) {
        throw new Error("Failed to upload avatar image");
      }

      updateUser({ avatarUrl: optimizedDataUrl });
      toast({
        title: "Picture updated!",
        description: "Your profile photo has been saved successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err.message || "Could not save photo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto() {
    try {
      setIsUploadingPhoto(true);
      setAvatarPreview(null);
      form.setValue("avatarUrl", "");

      const res = await apiFetch("/api/auth/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: null }),
      });

      if (!res.ok) {
        throw new Error("Failed to remove avatar");
      }

      updateUser({ avatarUrl: null });
      toast({
        title: "Picture removed",
        description: "Your profile photo has been reset.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Could not remove photo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  function onSubmit(data: ProfileForm) {
    const payload: any = {
      name:      data.name,
      phone:     data.phone || null,
      wilaya:    data.wilaya,
      bloodType: data.bloodType || null,
      avatarUrl: data.avatarUrl || avatarPreview || null,
    };

    if (user?.role === "doctor") {
      payload.doctorProfile = {
        specialty:            data.doctorSpecialty   ?? "",
        address:              data.doctorAddress     ?? "",
        availableDays:        data.doctorAvailableDays ?? "Mon-Fri",
        availableHours:       `${data.doctorOpenTime} - ${data.doctorCloseTime}`,
        consultationFee:      data.doctorFee         ?? 2000,
        isOnlineConsultation: data.doctorOnline      ?? false,
        lat:                  data.doctorLat         ?? null,
        lng:                  data.doctorLng         ?? null,
      };
    }

    if (user?.role === "pharmacy") {
      payload.pharmacyProfile = {
        address:   data.pharmacyAddress ?? "",
        is24h:     data.pharmacyIs24h   ?? false,
        openTime:  data.pharmacyIs24h ? "00:00" : (data.pharmacyOpenTime  ?? "08:00"),
        closeTime: data.pharmacyIs24h ? "23:59" : (data.pharmacyCloseTime ?? "21:00"),
        lat:       data.pharmacyLat    ?? null,
        lng:       data.pharmacyLng    ?? null,
      };
    }

    updateMutation.mutate({ data: payload }, {
      onSuccess: (res) => {
        // Refresh the auth user data in context
        setAuth(token ?? "", {
          id: res.id, name: res.name, email: res.email,
          phone: res.phone ?? null, wilaya: res.wilaya ?? null,
          role: res.role, createdAt: res.createdAt,
          avatarUrl: (res as any).avatarUrl ?? null,
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
      {/* iOS Liquid Glass Profile Header with Photo Upload */}
      <div className="relative overflow-hidden rounded-3xl border border-white/80 dark:border-white/10 bg-gradient-to-br from-white/85 via-white/60 to-sky-50/40 dark:from-slate-900/75 dark:via-slate-900/55 dark:to-sky-950/20 backdrop-blur-2xl p-6 md:p-8 shadow-[0_12px_40px_rgba(14,165,233,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with Camera Overlay */}
          <div className="relative group shrink-0">
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-3xl overflow-hidden border-2 border-white dark:border-white/20 bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-[0_8px_24px_rgba(14,165,233,0.3)]">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={user?.name || "User"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{user?.name?.[0]?.toUpperCase() ?? "U"}</span>
              )}
            </div>
            
            {/* Camera badge trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center border-2 border-white dark:border-slate-900 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
              title="Change picture"
            >
              {isUploadingPhoto ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Profile metadata & Upload Action Buttons */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">{user?.name}</h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-muted-foreground text-xs mt-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold capitalize">
                    {roleIcon}
                    {roleLabel}
                  </span>
                  {user?.wilaya && <span className="font-medium">• {user.wilaya}, Algeria</span>}
                  <span>• {user?.email}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center sm:justify-end gap-2 pt-1 sm:pt-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="rounded-xl text-xs font-semibold h-9 gap-1.5 border-white/70 dark:border-white/10 bg-white/70 dark:bg-white/5 hover:bg-white/90 shadow-2xs"
                >
                  <Upload className="h-3.5 w-3.5 text-primary" />
                  {avatarPreview ? "Change Photo" : "Add Picture"}
                </Button>

                {avatarPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePhoto}
                    disabled={isUploadingPhoto}
                    className="rounded-xl text-xs font-medium h-9 text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                    title="Remove picture"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Click the photo or "Add Picture" to upload your personal profile photo from your device.
            </p>
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

              <div className="grid grid-cols-2 gap-4">
                {/* Blood type — shown only for patients */}
                {!isDoctor && !isPharmacy && (
                  <FormField control={form.control} name="bloodType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blood Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "unknown"}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select blood type" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unknown">Unknown</SelectItem>
                          {BLOOD_TYPES.map(bt => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
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

                <div className="space-y-3">
                  <Label>Clinic Location</Label>
                  <MapLocationPicker 
                    value={form.watch("doctorLat") && form.watch("doctorLng") ? { lat: form.watch("doctorLat")!, lng: form.watch("doctorLng")! } : undefined}
                    onChange={(loc) => {
                      form.setValue("doctorLat", loc.lat);
                      form.setValue("doctorLng", loc.lng);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Click on the map to set your clinic's precise location for patients.</p>
                </div>
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

                <div className="space-y-3 pt-2">
                  <Label>Pharmacy Location</Label>
                  <MapLocationPicker 
                    value={form.watch("pharmacyLat") && form.watch("pharmacyLng") ? { lat: form.watch("pharmacyLat")!, lng: form.watch("pharmacyLng")! } : undefined}
                    onChange={(loc) => {
                      form.setValue("pharmacyLat", loc.lat);
                      form.setValue("pharmacyLng", loc.lng);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Click on the map to set your pharmacy's location so patients can find you.</p>
                </div>
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
