import { useState } from "react";
import { useListRecords, useCreateRecord, useDeleteRecord, getListRecordsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Trash2, Download, Stethoscope, FlaskConical, ScanLine, FolderOpen } from "lucide-react";
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

const categories = [
  { value: "prescription", label: "Prescription", icon: Stethoscope },
  { value: "test", label: "Lab Test", icon: FlaskConical },
  { value: "scan", label: "Scan / Imaging", icon: ScanLine },
  { value: "other", label: "Other", icon: FolderOpen },
];

function getCategoryIcon(category: string) {
  const found = categories.find(c => c.value === category);
  const Icon = found?.icon ?? FolderOpen;
  return <Icon className="h-4 w-4" />;
}

function getCategoryColor(category: string) {
  const map: Record<string, string> = {
    prescription: "bg-blue-100 text-blue-700",
    test: "bg-green-100 text-green-700",
    scan: "bg-purple-100 text-purple-700",
    other: "bg-gray-100 text-gray-700",
  };
  return map[category] ?? "bg-gray-100 text-gray-700";
}

export default function Records() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: records, isLoading } = useListRecords();
  const createRecord = useCreateRecord();
  const deleteRecord = useDeleteRecord();

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [form, setForm] = useState({
    title: "",
    category: "prescription",
    description: "",
    fileUrl: "",
    fileName: "",
    recordDate: new Date().toISOString().split("T")[0],
  });

  const filteredRecords = filter === "all"
    ? (records ?? [])
    : (records ?? []).filter(r => r.category === filter);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createRecord.mutate(
      { data: { ...form, description: form.description || null, fileUrl: form.fileUrl || null, fileName: form.fileName || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRecordsQueryKey() });
          setOpen(false);
          setForm({ title: "", category: "prescription", description: "", fileUrl: "", fileName: "", recordDate: new Date().toISOString().split("T")[0] });
          toast({ title: "Record added successfully" });
        },
        onError: () => toast({ title: "Failed to add record", variant: "destructive" }),
      }
    );
  }

  function handleDelete(id: number) {
    deleteRecord.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRecordsQueryKey() });
          toast({ title: "Record deleted" });
        },
        onError: () => toast({ title: "Failed to delete record", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medical Records</h1>
          <p className="text-muted-foreground mt-1">Store and manage your health documents securely.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Add Record</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Medical Record</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input placeholder="e.g. Blood Test Results" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={form.recordDate} onChange={e => setForm(f => ({ ...f, recordDate: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Description (optional)</Label>
                <Textarea placeholder="Notes about this record..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-1">
                <Label>File URL (optional)</Label>
                <Input placeholder="https://..." value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createRecord.isPending}>{createRecord.isPending ? "Saving..." : "Save Record"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
        {categories.map(c => (
          <Button key={c.value} size="sm" variant={filter === c.value ? "default" : "outline"} onClick={() => setFilter(c.value)}>{c.label}</Button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center text-muted-foreground">
          <FileText className="h-12 w-12 mb-3 opacity-20" />
          <p className="font-medium">No records found</p>
          <p className="text-sm mt-1">Add your first medical record to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecords.map(record => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-md ${getCategoryColor(record.category)}`}>
                      {getCategoryIcon(record.category)}
                    </div>
                    <CardTitle className="text-base font-semibold truncate">{record.title}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDelete(record.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="secondary" className="text-xs capitalize">{record.category}</Badge>
                <p className="text-xs text-muted-foreground">{format(parseISO(record.recordDate), "MMMM d, yyyy")}</p>
                {record.description && <p className="text-sm text-muted-foreground line-clamp-2">{record.description}</p>}
                {record.fileUrl && (
                  <a href={record.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-1">
                    <Download className="h-3 w-3" />
                    {record.fileName ?? "View File"}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
