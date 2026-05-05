import { useState } from "react";
import { useListPharmacies } from "@workspace/api-client-react";
import { MapPin, Phone, Clock, Search, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const WILAYAS = ["Algiers", "Oran", "Constantine", "Annaba", "Blida", "Setif", "Tizi Ouzou", "Batna"];

export default function Pharmacies() {
  const [medicine, setMedicine] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchWilaya, setSearchWilaya] = useState("");

  const { data: pharmacies, isLoading, refetch } = useListPharmacies(
    { medicine: searchTerm || undefined, wilaya: searchWilaya || undefined },
    { query: { queryKey: ["pharmacies", searchTerm, searchWilaya] as any } }
  );

  function handleSearch() {
    setSearchTerm(medicine);
    setSearchWilaya(wilaya);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pharmacy Search</h1>
        <p className="text-muted-foreground mt-1">Find medicines and nearby pharmacies in Algeria.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search medicine name..." value={medicine} onChange={e => setMedicine(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()} />
        </div>
        <Select value={wilaya} onValueChange={setWilaya}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="All Wilayas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Wilayas</SelectItem>
            {WILAYAS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Searching pharmacies...</div>
      ) : !pharmacies ? null : pharmacies.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No pharmacies found matching your search.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pharmacies.map(pharmacy => (
            <Card key={pharmacy.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{pharmacy.name}</CardTitle>
                  <div className="flex gap-1.5 shrink-0">
                    {pharmacy.isOpenNow ? (
                      <Badge className="bg-green-100 text-green-700 text-xs">Open</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Closed</Badge>
                    )}
                    {pharmacy.is24h && <Badge variant="outline" className="text-xs">24h</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /><span>{pharmacy.address}, {pharmacy.wilaya}</span></div>
                  {pharmacy.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" /><span>{pharmacy.phone}</span></div>}
                </div>

                {pharmacy.medicines.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Medicine Availability</p>
                    <div className="space-y-1.5">
                      {pharmacy.medicines.map((med, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-2">
                            {med.available
                              ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              : <XCircle className="h-3.5 w-3.5 text-red-400" />}
                            <span className={med.available ? "" : "text-muted-foreground line-through"}>{med.name}</span>
                          </div>
                          {med.available && med.price && (
                            <span className="text-xs font-medium text-primary">{med.price.toLocaleString()} DZD</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
