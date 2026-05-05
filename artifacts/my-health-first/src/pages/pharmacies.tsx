import { useState } from "react";
import { useListPharmacies } from "@workspace/api-client-react";
import { MapPin, Phone, Search, CheckCircle, XCircle, Store, Clock3, Activity, Pill } from "lucide-react";
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

  // Always fetch all pharmacies for stats
  const { data: allPharmacies } = useListPharmacies({}, { query: { queryKey: ["pharmacies-all"] as any } });
  const { data: pharmacies, isLoading } = useListPharmacies(
    { medicine: searchTerm || undefined, wilaya: searchWilaya || undefined },
    { query: { queryKey: ["pharmacies", searchTerm, searchWilaya] as any } }
  );

  function handleSearch() {
    setSearchTerm(medicine);
    setSearchWilaya(wilaya);
  }

  // Stats from all pharmacies
  const all = allPharmacies ?? [];
  const openNowCount = all.filter(p => p.isOpenNow).length;
  const open24hCount = all.filter(p => p.is24h).length;
  const totalMedicines = all.reduce((sum, p) => sum + (p.medicines?.length ?? 0), 0);
  const availableMeds = all.reduce((sum, p) => sum + (p.medicines?.filter((m: any) => m.available).length ?? 0), 0);

  // Wilaya breakdown for quick filter
  const wilayaCounts = all.reduce<Record<string, number>>((acc, p) => {
    acc[p.wilaya] = (acc[p.wilaya] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pharmacy Search</h1>
        <p className="text-muted-foreground mt-1">Find medicines and nearby pharmacies in Algeria.</p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{all.length}</p>
              <p className="text-xs text-muted-foreground">Pharmacies</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openNowCount}</p>
              <p className="text-xs text-muted-foreground">Open Now</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Clock3 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{open24hCount}</p>
              <p className="text-xs text-muted-foreground">Open 24h</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <Pill className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{availableMeds}<span className="text-sm font-normal text-muted-foreground">/{totalMedicines}</span></p>
              <p className="text-xs text-muted-foreground">Meds In Stock</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wilaya quick-filter chips */}
      {Object.keys(wilayaCounts).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Browse by Wilaya</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setWilaya(""); setSearchWilaya(""); }}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${searchWilaya === "" && wilaya === "" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
            >
              All
            </button>
            {Object.entries(wilayaCounts).map(([w, count]) => (
              <button
                key={w}
                onClick={() => {
                  const next = searchWilaya === w ? "" : w;
                  setWilaya(next);
                  setSearchWilaya(next);
                }}
                className={`px-3 py-1 rounded-full text-sm border transition-colors flex items-center gap-1.5 ${searchWilaya === w ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
              >
                {w}
                <span className={`text-xs rounded-full px-1.5 ${searchWilaya === w ? "bg-white/20" : "bg-muted"}`}>{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search medicine name..." value={medicine} onChange={e => setMedicine(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()} />
        </div>
        <Select value={wilaya} onValueChange={v => { setWilaya(v); setSearchWilaya(v); }}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="All Wilayas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Wilayas</SelectItem>
            {WILAYAS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {/* Results count */}
      {!isLoading && pharmacies && (
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{pharmacies.length}</span> pharmacy{pharmacies.length !== 1 ? "ies" : ""}
          {searchTerm && <> with <span className="font-semibold text-foreground">"{searchTerm}"</span></>}
          {searchWilaya && <> in <span className="font-semibold text-foreground">{searchWilaya}</span></>}
        </p>
      )}

      {/* Pharmacy cards */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Searching pharmacies...</div>
      ) : !pharmacies ? null : pharmacies.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center text-muted-foreground">
          <Store className="h-12 w-12 mb-3 opacity-20" />
          <p className="font-medium">No pharmacies found</p>
          <p className="text-sm mt-1">Try a different medicine name or wilaya.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pharmacies.map(pharmacy => {
            const availCount = pharmacy.medicines?.filter((m: any) => m.available).length ?? 0;
            const totalCount = pharmacy.medicines?.length ?? 0;
            return (
              <Card key={pharmacy.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Store className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-base truncate">{pharmacy.name}</CardTitle>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {pharmacy.isOpenNow ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Open</Badge>
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

                  {totalCount > 0 && (
                    <>
                      {/* Stock summary bar */}
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground font-medium uppercase tracking-wide">Stock</span>
                        <span className="font-semibold text-emerald-600">{availCount}/{totalCount} available</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all"
                          style={{ width: totalCount > 0 ? `${(availCount / totalCount) * 100}%` : "0%" }}
                        />
                      </div>

                      <div className="space-y-1.5">
                        {pharmacy.medicines.map((med: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                            <div className="flex items-center gap-2">
                              {med.available
                                ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                              <span className={med.available ? "" : "text-muted-foreground line-through"}>{med.name}</span>
                            </div>
                            {med.available && med.price ? (
                              <span className="text-xs font-semibold text-primary">{med.price.toLocaleString()} DZD</span>
                            ) : !med.available ? (
                              <span className="text-xs text-muted-foreground">Out of stock</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
