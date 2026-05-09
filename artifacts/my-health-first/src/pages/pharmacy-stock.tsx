import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useListPharmacies } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Save, Loader2, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PharmacyStock() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: pharmacies, isLoading } = useListPharmacies({}, { query: { queryKey: ["pharmacies-all"] as any } });
  
  const myPharmacy = pharmacies?.find(p => p.name === user?.name);
  
  const [medicines, setMedicines] = useState<{name: string, available: boolean, price: number | null}[]>([]);
  const [newMedName, setNewMedName] = useState("");
  const [newMedPrice, setNewMedPrice] = useState("");
  
  useEffect(() => {
    if (myPharmacy && myPharmacy.medicines) {
      setMedicines(myPharmacy.medicines);
    }
  }, [myPharmacy]);

  const updateStockMutation = useMutation({
    mutationFn: async (meds: typeof medicines) => {
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
      price: newMedPrice ? parseFloat(newMedPrice) : null 
    }, ...medicines]);
    setNewMedName("");
    setNewMedPrice("");
  };

  const handleRemove = (index: number) => {
    const next = [...medicines];
    next.splice(index, 1);
    setMedicines(next);
  };

  const handleToggle = (index: number) => {
    const next = [...medicines];
    next[index].available = !next[index].available;
    setMedicines(next);
  };

  const handleSave = () => {
    updateStockMutation.mutate(medicines);
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
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>Medicine Name</Label>
              <Input placeholder="e.g. Paracetamol 500mg" value={newMedName} onChange={e => setNewMedName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} />
            </div>
            <div className="space-y-2 w-full sm:w-32">
              <Label>Price (DZD)</Label>
              <Input type="number" placeholder="Optional" value={newMedPrice} onChange={e => setNewMedPrice(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} />
            </div>
            <Button onClick={handleAdd} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Add</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Current Inventory</CardTitle>
            <CardDescription>Update availability or remove medicines</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={updateStockMutation.isPending} className="px-6">
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
            <div className="rounded-md border">
              <div className="grid grid-cols-12 gap-4 p-3 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
                <div className="col-span-6 sm:col-span-7">Medicine</div>
                <div className="col-span-3 sm:col-span-2 text-right">Price</div>
                <div className="col-span-2 sm:col-span-2 text-center">Available</div>
                <div className="col-span-1 sm:col-span-1"></div>
              </div>
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {medicines.map((med, i) => (
                  <div key={i} className="grid grid-cols-12 gap-4 p-3 items-center text-sm transition-colors hover:bg-muted/20">
                    <div className="col-span-6 sm:col-span-7 font-medium truncate" title={med.name}>
                      <span className={med.available ? "" : "text-muted-foreground line-through"}>{med.name}</span>
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-right text-muted-foreground">
                      {med.price ? `${med.price} DZD` : "-"}
                    </div>
                    <div className="col-span-2 sm:col-span-2 flex justify-center">
                      <Checkbox checked={med.available} onCheckedChange={() => handleToggle(i)} />
                    </div>
                    <div className="col-span-1 sm:col-span-1 flex justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleRemove(i)}>
                        <Trash2 className="h-4 w-4" />
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
