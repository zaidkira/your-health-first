import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { 
  Activity, 
  Heart, 
  Wind, 
  Footprints, 
  Link as LinkIcon, 
  AlertCircle,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { format } from "date-fns";

interface BraceletReading {
  id: string;
  heartRate: number;
  spo2: number;
  steps: number;
  activity: "resting" | "walking" | "active";
  timestamp: string;
}

export default function BraceletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deviceIdInput, setDeviceIdInput] = useState("");
  const [isBleConnecting, setIsBleConnecting] = useState(false);
  const [bleDevice, setBleDevice] = useState<BluetoothDevice | null>(null);

  const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

  // Function to connect via Bluetooth
  const connectBluetooth = async () => {
    try {
      setIsBleConnecting(true);
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: "MyHealthBracelet" }],
        optionalServices: [SERVICE_UUID]
      });

      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService(SERVICE_UUID);
      const characteristic = await service?.getCharacteristic(CHARACTERISTIC_UUID);

      setBleDevice(device);
      toast({ title: "Connected", description: "Linked to bracelet via Bluetooth!" });

      // Listen for notifications
      await characteristic?.startNotifications();
      characteristic?.addEventListener("characteristicvaluechanged", (event: any) => {
        const value = new TextDecoder().decode(event.target.value);
        const [hr, sp, st] = value.split(",").map(Number);
        
        // Forward this data to the backend to save it
        forwardDataToBackend(hr, sp, st);
      });

      device.addEventListener("gattserverdisconnected", () => {
        setBleDevice(null);
        toast({ title: "Disconnected", description: "Bluetooth connection lost.", variant: "destructive" });
      });

    } catch (error) {
      console.error(error);
      toast({ title: "Connection Failed", description: "Could not connect to Bluetooth device.", variant: "destructive" });
    } finally {
      setIsBleConnecting(false);
    }
  };

  const forwardDataToBackend = async (heartRate: number, spo2: number, steps: number) => {
    try {
      await fetch("/api/bracelet/data", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-api-key": "bracelet-secret-key" // Using the same key for now
        },
        body: JSON.stringify({
          device_id: user?.deviceId || "BLE_DEVICE",
          heartRate,
          spo2,
          steps,
          activity: steps > 10 ? "active" : "resting"
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bracelet/latest", user?.id] });
    } catch (err) {
      console.error("Failed to forward BLE data:", err);
    }
  };

  // Fetch latest readings - refresh every 5 seconds
  const { data: readings, isLoading } = useQuery<BraceletReading[]>({
    queryKey: ["/api/bracelet/latest", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/bracelet/latest/${user?.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch readings");
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  // Link device mutation
  const linkMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const res = await fetch("/api/bracelet/link", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
        body: JSON.stringify({ device_id: deviceId }),
      });
      if (!res.ok) throw new Error("Failed to link device");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Bracelet linked successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/me"] }); // Refresh user data to get deviceId
    },
    onError: (err: any) => {
      toast({ 
        title: "Error", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });

  const latestReading = readings?.[readings.length - 1];

  const getStatus = (reading: BraceletReading) => {
    if (reading.spo2 < 92) return { label: "Critical", color: "bg-red-500", icon: AlertCircle };
    if (reading.heartRate > 120 || reading.heartRate < 40) return { label: "Alert", color: "bg-orange-500", icon: AlertTriangle };
    return { label: "Normal", color: "bg-emerald-500", icon: CheckCircle2 };
  };

  const status = latestReading ? getStatus(latestReading) : null;

  const chartData = readings?.map(r => ({
    time: format(new Date(r.timestamp), "HH:mm"),
    heartRate: r.heartRate,
    spo2: r.spo2,
    steps: r.steps
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Health Bracelet</h1>
          <p className="text-muted-foreground mt-1">Real-time vitals monitoring from your wearable device.</p>
        </div>
        {!user?.deviceId && (
          <Badge variant="outline" className="px-3 py-1 text-sm bg-yellow-50 text-yellow-700 border-yellow-200">
            Device Not Linked
          </Badge>
        )}
        <Button 
          variant={bleDevice ? "secondary" : "outline"}
          className="gap-2"
          onClick={connectBluetooth}
          disabled={isBleConnecting}
        >
          <div className={`h-2 w-2 rounded-full ${bleDevice ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
          {isBleConnecting ? "Connecting..." : bleDevice ? "BLE Connected" : "Connect via Bluetooth"}
        </Button>
      </div>

      {/* Alerts Section */}
      <AnimatePresence>
        {status && status.label !== "Normal" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert variant={status.label === "Critical" ? "destructive" : "default"} className={status.label === "Alert" ? "border-orange-500 bg-orange-50" : ""}>
              <status.icon className="h-4 w-4" />
              <AlertTitle>{status.label} Health Warning</AlertTitle>
              <AlertDescription>
                {status.label === "Critical" 
                  ? `SpO2 level is critically low (${latestReading?.spo2}%). Please seek medical attention.`
                  : `Abnormal heart rate detected (${latestReading?.heartRate} BPM). Rest and monitor closely.`}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Section: Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard 
          title="Heart Rate" 
          value={latestReading?.heartRate} 
          unit="BPM" 
          icon={Heart} 
          accent="text-red-500" 
          status={latestReading ? (latestReading.heartRate > 100 ? "High" : latestReading.heartRate < 60 ? "Low" : "Normal") : "--"}
        />
        <StatCard 
          title="SpO2" 
          value={latestReading?.spo2} 
          unit="%" 
          icon={Wind} 
          accent="text-blue-500"
          status={latestReading ? (latestReading.spo2 < 95 ? "Low" : "Normal") : "--"}
        />
        <StatCard 
          title="Steps Today" 
          value={latestReading?.steps} 
          unit="steps" 
          icon={Footprints} 
          accent="text-emerald-500"
          status={latestReading?.activity}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ChartCard title="Heart Rate History" data={chartData} dataKey="heartRate" color="#ef4444" type="line" />
        <ChartCard title="SpO2 History" data={chartData} dataKey="spo2" color="#3b82f6" type="line" />
        <ChartCard title="Steps Progression" data={chartData} dataKey="steps" color="#10b981" type="bar" />
      </div>

      {/* Connect Device Section */}
      {!user?.deviceId && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Connect Your Bracelet
            </CardTitle>
            <CardDescription>
              Enter your device ID to start syncing your health data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 max-w-md">
              <Input 
                placeholder="e.g. BRACELET_001" 
                value={deviceIdInput} 
                onChange={(e) => setDeviceIdInput(e.target.value)}
                className="bg-background/50 backdrop-blur-sm"
              />
              <Button 
                onClick={() => linkMutation.mutate(deviceIdInput)}
                disabled={linkMutation.isPending || !deviceIdInput}
              >
                {linkMutation.isPending ? "Linking..." : "Link My Bracelet"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

function StatCard({ title, value, unit, icon: Icon, accent, status }: any) {
  return (
    <Card className="overflow-hidden border-none shadow-lg bg-white/50 backdrop-blur-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg bg-background/50 ${accent}`}>
            <Icon className="h-6 w-6" />
          </div>
          <Badge variant="secondary" className="capitalize">
            {status}
          </Badge>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">{value ?? "--"}</span>
            <span className="text-sm text-muted-foreground">{unit}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, data, dataKey, color, type }: any) {
  return (
    <Card className="border-none shadow-lg bg-white/50 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: "#94a3b8" }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                domain={dataKey === "spo2" ? [80, 100] : ["auto", "auto"]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.8)", 
                  backdropFilter: "blur(4px)",
                  border: "none",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                }} 
              />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={color} 
                strokeWidth={3} 
                dot={{ r: 4, fill: color, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: "#94a3b8" }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <Tooltip 
                 contentStyle={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.8)", 
                  backdropFilter: "blur(4px)",
                  border: "none",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                }} 
              />
              <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
