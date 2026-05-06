import { useState } from "react";
import {
  useListConditions, useCreateCondition, useUpdateCondition, useDeleteCondition,
  getListConditionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Plus, Pencil, Trash2, AlertCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const SEVERITIES = [
  { value: "mild", label: "Mild", color: "bg-yellow-100 text-yellow-700" },
  { value: "moderate", label: "Moderate", color: "bg-orange-100 text-orange-700" },
  { value: "severe", label: "Severe", color: "bg-red-100 text-red-700" },
  { value: "controlled", label: "Controlled", color: "bg-green-100 text-green-700" },
];

const COMMON_CONDITIONS = [
  "Diabetes (Type 1)", "Diabetes (Type 2)", "Hypertension", "Asthma",
  "Heart Disease", "Kidney Disease", "Liver Disease", "Arthritis",
  "Epilepsy", "Thyroid Disorder", "Depression", "Anxiety",
];

function getSeverityColor(severity: string | null | undefined) {
  if (!severity) return "bg-gray-100 text-gray-600";
  return SEVERITIES.find(s => s.value === severity)?.color ?? "bg-gray-100 text-gray-600";
}

const emptyForm = { name: "", diagnosedYear: "", severity: "", notes: "" };

export default function Conditions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: conditions, isLoading } = useListConditions();
  const createCondition = useCreateCondition();
  const updateCondition = useUpdateCondition();
  const deleteCondition = useDeleteCondition();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<null | number>(null);
  const [form, setForm] = useState(emptyForm);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: { id: number; name: string; diagnosedYear?: string | null; severity?: string | null; notes?: string | null }) {
    setEditing(c.id);
    setForm({ name: c.name, diagnosedYear: c.diagnosedYear ?? "", severity: c.severity ?? "", notes: c.notes ?? "" });
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name: form.name,
      diagnosedYear: form.diagnosedYear || null,
      severity: form.severity || null,
      notes: form.notes || null,
    };

    if (editing !== null) {
      updateCondition.mutate(
        { id: editing, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListConditionsQueryKey() });
            setOpen(false);
            toast({ title: "Condition updated" });
          },
          onError: () => toast({ title: "Failed to update", variant: "destructive" }),
        }
      );
    } else {
      createCondition.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListConditionsQueryKey() });
            setOpen(false);
            toast({ title: "Condition added" });
          },
          onError: () => toast({ title: "Failed to add", variant: "destructive" }),
        }
      );
    }
  }

  function handleDelete(id: number) {
    deleteCondition.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListConditionsQueryKey() });
          toast({ title: "Condition removed" });
        },
        onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
      }
    );
  }

  const isPending = createCondition.isPending || updateCondition.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chronic Conditions</h1>
          <p className="text-muted-foreground mt-1">Track and manage your long-term health conditions.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" />Add Condition</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing !== null ? "Edit Condition" : "Add Chronic Condition"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Condition Name</Label>
                <Input
                  placeholder="e.g. Diabetes, Hypertension..."
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  list="common-conditions"
                  required
                />
                <datalist id="common-conditions">
                  {COMMON_CONDITIONS.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Year Diagnosed</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 2019"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={form.diagnosedYear}
                    onChange={e => setForm(f => ({ ...f, diagnosedYear: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Severity</Label>
                  <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Medications, treatments, any extra info..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : editing !== null ? "Update" : "Add Condition"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (conditions ?? []).length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center text-muted-foreground">
          <Activity className="h-12 w-12 mb-3 opacity-20" />
          <p className="font-medium">No chronic conditions recorded</p>
          <p className="text-sm mt-1">Add any long-term conditions you'd like to track.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(conditions ?? []).map(condition => (
            <Card key={condition.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-md bg-red-50 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base font-semibold truncate">{condition.name}</CardTitle>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(condition)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(condition.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {condition.severity && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSeverityColor(condition.severity)}`}>
                      {SEVERITIES.find(s => s.value === condition.severity)?.label ?? condition.severity}
                    </span>
                  )}
                  {condition.diagnosedYear && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                      Since {condition.diagnosedYear}
                    </span>
                  )}
                </div>
                {condition.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mt-1">{condition.notes}</p>
                )}
                <p className="text-xs text-muted-foreground pt-1">Added {format(parseISO(condition.createdAt), "MMM d, yyyy")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
