import { useState } from "react";
import {
  useListRecords, useCreateRecord, useDeleteRecord, getListRecordsQueryKey,
  useShareRecord, useListSentRecords, useListReceivedRecords,
  useReplyToSharedRecord, getListReceivedRecordsQueryKey, getListSentRecordsQueryKey,
  useListDoctors,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  FileText, Plus, Trash2, Download, Stethoscope, FlaskConical,
  ScanLine, FolderOpen, Send, Inbox, ArrowUpRight, MessageSquare, Users, X, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const emptyForm = {
  title: "",
  category: "prescription",
  description: "",
  fileUrl: "",
  fileName: "",
  recordDate: new Date().toISOString().split("T")[0],
};

export default function Records() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: records, isLoading } = useListRecords();
  const { data: sentRecords } = useListSentRecords();
  const { data: receivedRecords } = useListReceivedRecords();
  const { data: doctors } = useListDoctors({});

  const createRecord = useCreateRecord();
  const deleteRecord = useDeleteRecord();
  const shareRecord = useShareRecord();

  const [addOpen, setAddOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [shareRecordId, setShareRecordId] = useState<number | null>(null);
  const [replyRecordId, setReplyRecordId] = useState<number | null>(null);
  const [shareForm, setShareForm] = useState({ doctorId: "", message: "" });
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRecords = filter === "all"
    ? (records ?? [])
    : (records ?? []).filter(r => r.category === filter);

  const filteredDoctors = (doctors ?? []).filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createRecord.mutate(
      { data: { ...form, description: form.description || null, fileUrl: form.fileUrl || null, fileName: form.fileName || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRecordsQueryKey() });
          setAddOpen(false);
          setForm(emptyForm);
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

  function openShare(recordId: number) {
    setShareRecordId(recordId);
    setShareForm({ doctorId: "", message: "" });
    setSearchTerm("");
    setShareOpen(true);
  }

  function handleShare(e: React.FormEvent) {
    e.preventDefault();
    if (!shareRecordId || !shareForm.doctorId) return;
    shareRecord.mutate(
      { id: shareRecordId, data: { doctorId: Number(shareForm.doctorId), message: shareForm.message || null } },
      {
        onSuccess: () => {
          setShareOpen(false);
          toast({ title: "Record sent to doctor successfully" });
        },
        onError: () => toast({ title: "Failed to send record", variant: "destructive" }),
      }
    );
  }
  
  const replyToRecord = useReplyToSharedRecord();

  function openReply(id: number) {
    setReplyRecordId(id);
    setReplyText("");
    setReplyOpen(true);
  }

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyRecordId || !replyText) return;
    replyToRecord.mutate(
      { id: replyRecordId, data: { reply: replyText } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReceivedRecordsQueryKey() });
          setReplyOpen(false);
          toast({ title: "Reply sent to patient" });
        },
        onError: () => toast({ title: "Failed to send reply", variant: "destructive" }),
      }
    );
  }

  const isDoctor = user?.role === "doctor";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medical Records</h1>
          <p className="text-muted-foreground mt-1">Store, manage, and share your health documents securely.</p>
        </div>
        {!isDoctor && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
                <div className="space-y-2 border-2 border-dashed rounded-lg p-4 bg-muted/20">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">File Attachment</Label>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="file-upload" className="text-sm font-medium">Upload File</Label>
                      <Input 
                        id="file-upload"
                        type="file" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setForm(f => ({ 
                                ...f, 
                                fileUrl: reader.result as string,
                                fileName: file.name 
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="cursor-pointer"
                      />
                    </div>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or paste URL</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="file-url" className="text-sm font-medium">File URL</Label>
                      <Input 
                        id="file-url"
                        placeholder="https://..." 
                        value={form.fileUrl.startsWith('data:') ? '' : form.fileUrl} 
                        onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value, fileName: e.target.value.split('/').pop() || "" }))} 
                      />
                    </div>
                    
                    {form.fileUrl && (
                      <div className="flex items-center gap-2 p-2 bg-primary/10 rounded border border-primary/20">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium truncate flex-1">{form.fileName || "File selected"}</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={() => setForm(f => ({ ...f, fileUrl: "", fileName: "" }))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createRecord.isPending}>{createRecord.isPending ? "Saving..." : "Save Record"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Share with Doctor Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Record to Doctor</DialogTitle></DialogHeader>
          <form onSubmit={handleShare} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Select Doctor</Label>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search doctor by name or specialty..." 
                  className="pl-9 text-sm h-9"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={searchTerm}
                />
              </div>
              <Select value={shareForm.doctorId} onValueChange={v => setShareForm(f => ({ ...f, doctorId: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose a doctor..." /></SelectTrigger>
                <SelectContent>
                  {filteredDoctors.length === 0 ? (
                    <div className="py-6 px-2 text-center text-sm text-muted-foreground">
                      No doctors found matching your search.
                    </div>
                  ) : (
                    filteredDoctors.map(d => (
                      <SelectItem key={d.id} value={String(d.userId)}>{d.name} — {d.specialty}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Message (optional)</Label>
              <Textarea placeholder="Any note for the doctor..." value={shareForm.message} onChange={e => setShareForm(f => ({ ...f, message: e.target.value }))} rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShareOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={shareRecord.isPending || !shareForm.doctorId}>
                {shareRecord.isPending ? "Sending..." : "Send to Doctor"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Doctor Reply Dialog */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reply to Patient</DialogTitle></DialogHeader>
          <form onSubmit={handleReply} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Your Message</Label>
              <Textarea 
                placeholder="Write your feedback to the patient..." 
                value={replyText} 
                onChange={e => setReplyText(e.target.value)} 
                rows={4} 
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setReplyOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={replyToRecord.isPending || !replyText}>
                {replyToRecord.isPending ? "Sending..." : "Send Reply"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue={isDoctor ? "received" : "my"}>
        <TabsList>
          {!isDoctor && <TabsTrigger value="my">My Records</TabsTrigger>}
          {!isDoctor && <TabsTrigger value="sent" className="gap-1.5"><ArrowUpRight className="h-3.5 w-3.5" />Sent to Doctors</TabsTrigger>}
          {isDoctor && <TabsTrigger value="received" className="gap-1.5"><Inbox className="h-3.5 w-3.5" />Received from Patients</TabsTrigger>}
        </TabsList>

        {/* My Records Tab */}
        {!isDoctor && (
          <TabsContent value="my" className="space-y-4 mt-4">
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
                      <Button size="sm" variant="outline" className="w-full gap-2 mt-2" onClick={() => openShare(record.id)}>
                        <Send className="h-3.5 w-3.5" />Send to Doctor
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Sent Records Tab */}
        {!isDoctor && (
          <TabsContent value="sent" className="mt-4">
            {(sentRecords ?? []).length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center text-muted-foreground">
                <Send className="h-12 w-12 mb-3 opacity-20" />
                <p className="font-medium">No records sent yet</p>
                <p className="text-sm mt-1">Use the "Send to Doctor" button on any of your records.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(sentRecords ?? []).map(sr => (
                  <Card key={sr.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold truncate">{sr.record?.title ?? "—"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sr.record?.category && (
                        <Badge variant="secondary" className="text-xs capitalize">{sr.record.category}</Badge>
                      )}
                      <p className="text-xs text-muted-foreground">Sent to: <span className="font-medium text-foreground">{(sr as any).doctorName ?? `Doctor #${sr.doctorId}`}</span></p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(sr.sentAt), "MMM d, yyyy")}</p>
                      {sr.message && <p className="text-sm text-muted-foreground italic">"{sr.message}"</p>}
                      {sr.doctorReply && (
                        <div className="mt-3 p-2 bg-blue-50 rounded-md border border-blue-100">
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <MessageSquare className="h-2.5 w-2.5" /> Doctor's Reply
                          </p>
                          <p className="text-sm text-blue-900 leading-tight">{sr.doctorReply}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Received Records Tab (doctors) */}
        {isDoctor && (
          <TabsContent value="received" className="mt-4">
            {(receivedRecords ?? []).length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center text-muted-foreground">
                <Inbox className="h-12 w-12 mb-3 opacity-20" />
                <p className="font-medium">No records received yet</p>
                <p className="text-sm mt-1">Patients can send you their medical records from this page.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(receivedRecords ?? []).map(sr => (
                  <Card key={sr.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold truncate">{sr.record?.title ?? "—"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sr.record?.category && (
                        <Badge variant="secondary" className="text-xs capitalize">{sr.record.category}</Badge>
                      )}
                      <p className="text-xs text-muted-foreground">From: <span className="font-medium text-foreground">{(sr as any).senderName ?? `Patient #${sr.senderId}`}</span></p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(sr.sentAt), "MMM d, yyyy")}</p>
                      {sr.message && <p className="text-sm text-muted-foreground italic">"{sr.message}"</p>}
                      {sr.record?.description && <p className="text-sm text-muted-foreground line-clamp-2">{sr.record.description}</p>}
                      {sr.record?.fileUrl && (
                        <a href={sr.record.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                          <Download className="h-3 w-3" />
                          {sr.record.fileName ?? "View File"}
                        </a>
                      )}
                      
                      {sr.doctorReply ? (
                        <div className="mt-3 p-2 bg-green-50 rounded-md border border-green-100">
                          <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Your Reply</p>
                          <p className="text-sm text-green-900 leading-tight">{sr.doctorReply}</p>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full gap-2 mt-2" onClick={() => openReply(sr.id)}>
                          <MessageSquare className="h-3.5 w-3.5" /> Reply to Patient
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
