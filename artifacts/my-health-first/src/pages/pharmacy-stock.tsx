import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useListPharmacies } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Loader2, Store, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Medicine = {
  name: string;
  available: boolean;
  price?: number | null;
  quantity?: number | null;
  requiresPrescription?: boolean;
};

export default function PharmacyStock() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: pharmacies, isLoading } = useListPharmacies({}, { query: { queryKey: ["pharmacies-all"] as any } });
  const myPharmacy = pharmacies?.find(p => p.name === user?.name);
  
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [newMedName, setNewMedName] = useState("");
  const [newMedPrice, setNewMedPrice] = useState("");
  const [newMedQty, setNewMedQty] = useState("");
  const [newMedRx, setNewMedRx] = useState(false);

  useEffect(() => {
    if (myPharmacy && myPharmacy.medicines) {
      setMedicines(myPharmacy.medicines as Medicine[]);
    }
  }, [myPharmacy]);

  const updateStockMutation = useMutation({
    mutationFn: async (meds: Medicine[]) => {
      const res = await fetch("/api/pharmacies/medicines", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(meds)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update stock");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacies-all"] as any });
      toast({ title: "Stock updated", description: "Your medicines have been updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  });

  const handleAdd = () => {
    if (!newMedName.trim()) return;
    setMedicines([{ 
      name: newMedName.trim(), 
      available: true, 
      price: newMedPrice ? parseFloat(newMedPrice) : null,
      quantity: newMedQty ? parseInt(newMedQty) : null,
      requiresPrescription: newMedRx,
    }, ...medicines]);
    setNewMedName("");
    setNewMedPrice("");
    setNewMedQty("");
    setNewMedRx(false);
  };

  const handleRemove = (index: number) => {
    const next = [...medicines];
    next.splice(index, 1);
    setMedicines(next);
  };

  const handleToggleAvailable = (index: number) => {
    const next = [...medicines];
    next[index].available = !next[index].available;
    setMedicines(next);
  };

  const handleToggleRx = (index: number) => {
    const next = [...medicines];
    next[index].requiresPrescription = !next[index].requiresPrescription;
    setMedicines(next);
  };

  const handleQtyChange = (index: number, val: string) => {
    const next = [...medicines];
    next[index].quantity = val ? parseInt(val) : null;
    setMedicines(next);
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (user?.role !== "pharmacy") {
    return <div className="p-8 text-center text-muted-foreground">Access Denied. Only pharmacies can view this page.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stock Management</h1>
        <p className="text-muted-foreground mt-1">Manage the medicines available in your pharmacy.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="h-4 w-4" /> Add New Medicine
          </CardTitle>
          <CardDescription>Add a medicine to your inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>Medicine Name</Label>
              <Input placeholder="e.g. Paracetamol 500mg" value={newMedName} onChange={e => setNewMedName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} />
            </div>
            <div className="space-y-2">
              <Label>Price (DZD)</Label>
              <Input type="number" placeholder="Optional" value={newMedPrice} onChange={e => setNewMedPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Quantity in Stock</Label>
              <Input type="number" placeholder="e.g. 50" value={newMedQty} onChange={e => setNewMedQty(e.target.value)} />
            </div>
            <div className="space-y-2 flex flex-col justify-end">
              <div
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${newMedRx ? "border-amber-400 bg-amber-50" : "border-border"}`}
                onClick={() => setNewMedRx(!newMedRx)}
              >
                <FileText className={`h-4 w-4 shrink-0 ${newMedRx ? "text-amber-600" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${newMedRx ? "text-amber-700" : "text-muted-foreground"}`}>
                  {newMedRx ? "Needs Prescription ✓" : "No Prescription Needed"}
                </span>
              </div>
            </div>
          </div>
          <Button onClick={handleAdd} className="mt-4 w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Add Medicine
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Current Inventory</CardTitle>
            <CardDescription>Update availability, quantity, or remove medicines</CardDescription>
          </div>
          <Button onClick={() => updateStockMutation.mutate(medicines)} disabled={updateStockMutation.isPending} className="px-6">
            {updateStockMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </CardHeader>
        <CardContent>
          {medicines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
              No medicines in stock. Add some above.
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-3 border-b bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">Medicine</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-center">Available</div>
                <div className="col-span-1 text-center">Rx</div>
                <div className="col-span-1"></div>
              </div>
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {medicines.map((med, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 p-3 items-center text-sm transition-colors hover:bg-muted/20">
                    <div className="col-span-4 min-w-0">
                      <span className={`font-medium truncate block ${!med.available ? "text-muted-foreground line-through" : ""}`} title={med.name}>
                        {med.name}
                      </span>
                      {med.requiresPrescription && (
                        <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600 mt-0.5 h-4 px-1">Rx</Badge>
                      )}
                    </div>
                    <div className="col-span-2 text-right text-muted-foreground text-xs">
                      {med.price ? `${med.price} DZD` : "-"}
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <Input
                        type="number"
                        className="h-7 text-xs text-center w-16 px-1"
                        value={med.quantity ?? ""}
                        placeholder="—"
                        onChange={e => handleQtyChange(i, e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <Checkbox checked={med.available} onCheckedChange={() => handleToggleAvailable(i)} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Checkbox
                        checked={!!med.requiresPrescription}
                        onCheckedChange={() => handleToggleRx(i)}
                        className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => handleRemove(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
