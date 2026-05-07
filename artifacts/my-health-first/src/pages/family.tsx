import { useState } from "react";
import {
  useListFamilyMembers, useCreateFamilyMember, useUpdateFamilyMember,
  useDeleteFamilyMember, getListFamilyMembersQueryKey,
  useListEmergencyContacts, useCreateEmergencyContact, useUpdateEmergencyContact,
  useDeleteEmergencyContact, getListEmergencyContactsQueryKey,
  useGetConnections, usePostConnections, usePatchConnectionsId,
  useDeleteConnectionsId, getGetConnectionsQueryKey,
  type Connection
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Users, Plus, Pencil, Trash2, Heart, Tag, Phone, AlertTriangle, X, 
  ChevronDown, ChevronUp, UserPlus, Check, UserMinus, Search, Clock,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const RELATIONSHIPS = ["Spouse", "Parent", "Child", "Sibling", "Grandparent", "Grandchild", "Other"];
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const CONTACT_RELATIONSHIPS = ["Spouse", "Parent", "Child", "Sibling", "Doctor", "Neighbor", "Friend", "Other"];

const emptyForm = { name: "", relationship: "Spouse", groupName: "", dateOfBirth: "", bloodType: "", notes: "" };
const emptyContactForm = { name: "", phone: "", relationship: "Spouse", notes: "" };

// ──────────────────────────────────────────────────────────────
// Emergency contacts panel
// ──────────────────────────────────────────────────────────────
function EmergencyContactsPanel({ memberId, memberName }: { memberId: number; memberName: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: contacts, isLoading } = useListEmergencyContacts(memberId);
  const createContact = useCreateEmergencyContact();
  const updateContact = useUpdateEmergencyContact();
  const deleteContact = useDeleteEmergencyContact();

  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyContactForm);

  function openAdd() {
    setEditingId(null);
    setForm(emptyContactForm);
    setAddOpen(true);
  }

  function openEdit(c: { id: number; name: string; phone: string; relationship: string; notes?: string | null }) {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone, relationship: c.relationship, notes: c.notes ?? "" });
    setAddOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { name: form.name, phone: form.phone, relationship: form.relationship, notes: form.notes || null };

    if (editingId !== null) {
      updateContact.mutate(
        { memberId, id: editingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEmergencyContactsQueryKey(memberId) });
            setAddOpen(false);
            toast({ title: "Contact updated" });
          },
          onError: () => toast({ title: "Failed to update contact", variant: "destructive" }),
        }
      );
    } else {
      createContact.mutate(
        { memberId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEmergencyContactsQueryKey(memberId) });
            setAddOpen(false);
            toast({ title: "Emergency contact added" });
          },
          onError: () => toast({ title: "Failed to add contact", variant: "destructive" }),
        }
      );
    }
  }

  function handleDelete(id: number) {
    deleteContact.mutate(
      { memberId, id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEmergencyContactsQueryKey(memberId) });
          toast({ title: "Contact removed" });
        },
        onError: () => toast({ title: "Failed to remove contact", variant: "destructive" }),
      }
    );
  }

  const isPending = createContact.isPending || updateContact.isPending;

  return (
    <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 uppercase tracking-wide">
          <AlertTriangle className="h-3.5 w-3.5" />
          Emergency Contacts
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1 border-red-200 text-red-700 hover:bg-red-50" onClick={openAdd}>
              <Plus className="h-3 w-3" />Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId !== null ? "Edit Emergency Contact" : `Add Emergency Contact for ${memberName}`}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Contact Name</Label>
                <Input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Phone Number</Label>
                  <Input type="tel" placeholder="+213..." value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Relationship</Label>
                  <Select value={form.relationship} onValueChange={v => setForm(f => ({ ...f, relationship: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONTACT_RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes (optional)</Label>
                <Textarea placeholder="Availability, preferred contact time..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white" disabled={isPending}>
                  {isPending ? "Saving..." : editingId !== null ? "Update Contact" : "Add Contact"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : (contacts ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No emergency contacts added yet.</p>
      ) : (
        <div className="space-y-2">
          {(contacts ?? []).map(c => (
            <div key={c.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-red-50 border border-red-100">
              <div className="flex items-start gap-2 min-w-0">
                <div className="h-7 w-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="h-3.5 w-3.5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate text-gray-900">{c.name}</p>
                  <p className="text-xs text-red-700 font-medium">{c.phone}</p>
                  <p className="text-xs text-muted-foreground">{c.relationship}</p>
                  {c.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{c.notes}</p>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => openEdit(c)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Member card
// ──────────────────────────────────────────────────────────────
function MemberCard({ member, onEdit, onDelete }: { 
  member: any; onEdit: (m: any) => void; onDelete: (id: number) => void;
}) {
  const [showContacts, setShowContacts] = useState(false);
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                {member.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{member.name}</p>
              <p className="text-sm text-muted-foreground">{member.relationship}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(member)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(member.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {member.groupName && (
          <div className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="outline" className="text-xs">{member.groupName}</Badge>
          </div>
        )}
        {member.bloodType && (
          <div className="flex items-center gap-2">
            <Heart className="h-3.5 w-3.5 text-red-400" />
            <Badge variant="outline" className="text-xs">Blood: {member.bloodType}</Badge>
          </div>
        )}
        {member.dateOfBirth && <p className="text-sm text-muted-foreground">Born: {member.dateOfBirth}</p>}
        {member.notes && <p className="text-sm text-muted-foreground line-clamp-2 italic">"{member.notes}"</p>}
        <button className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium mt-1 transition-colors" onClick={() => setShowContacts(v => !v)}>
          <AlertTriangle className="h-3.5 w-3.5" /> Emergency Contacts {showContacts ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
        </button>
        {showContacts && <EmergencyContactsPanel memberId={member.id} memberName={member.name} />}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// Health Circle (Connections) Tab
// ──────────────────────────────────────────────────────────────
function HealthCircle() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: connections, isLoading } = useGetConnections();
  const sendRequest = usePostConnections();
  const respondRequest = usePatchConnectionsId();
  const removeConnection = useDeleteConnectionsId();
  
  const [email, setEmail] = useState("");

  function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    sendRequest.mutate(
      { data: { email } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetConnectionsQueryKey() });
          setEmail("");
          toast({ title: "Request sent!" });
        },
        onError: (err: any) => toast({ title: "Failed", description: err.response?.data?.error || "User not found", variant: "destructive" }),
      }
    );
  }

  function handleRespond(id: number, status: "accepted" | "rejected") {
    respondRequest.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetConnectionsQueryKey() });
          toast({ title: status === "accepted" ? "Request accepted" : "Request rejected" });
        },
      }
    );
  }

  function handleRemove(id: number) {
    if (!window.confirm("Remove this connection?")) return;
    removeConnection.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetConnectionsQueryKey() });
          toast({ title: "Connection removed" });
        },
      }
    );
  }

  const pendingReceived = connections?.filter((c: Connection) => c.receiverId === user?.id && c.status === "pending");
  const pendingSent = connections?.filter((c: Connection) => c.senderId === user?.id && c.status === "pending");
  const active = connections?.filter((c: Connection) => c.status === "accepted");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-4 w-4" /> Add to Circle
          </CardTitle>
          <CardDescription>Find other users by email and invite them to your health circle.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendRequest} className="flex gap-2">
            <Input 
              placeholder="user@example.com" 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              className="max-w-md"
            />
            <Button type="submit" disabled={sendRequest.isPending} className="gap-2">
              <UserPlus className="h-4 w-4" /> Send Request
            </Button>
          </form>
        </CardContent>
      </Card>

      {pendingReceived && pendingReceived.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" /> Received Requests
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingReceived.map((c: Connection) => (
              <Card key={c.id} className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9"><AvatarFallback>{c.senderName?.charAt(0)}</AvatarFallback></Avatar>
                    <p className="font-medium text-sm">{c.senderName}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-100" onClick={() => handleRespond(c.id, "accepted")}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleRespond(c.id, "rejected")}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {active && active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Your Circle
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((c: Connection) => {
              const otherName = c.senderId === user?.id ? c.receiverName : c.senderName;
              return (
                <Card key={c.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">{otherName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{otherName}</p>
                        <Badge variant="outline" className="text-[10px] h-4">Connected</Badge>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(c.id)}>
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {pendingSent && pendingSent.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sent Requests</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingSent.map((c: Connection) => (
              <Card key={c.id} className="opacity-70">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9"><AvatarFallback>{c.receiverName?.charAt(0)}</AvatarFallback></Avatar>
                    <p className="font-medium text-sm">{c.receiverName}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRemove(c.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!isLoading && connections?.length === 0 && (
        <div className="text-center py-12 bg-muted/30 rounded-xl border-2 border-dashed">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium text-muted-foreground">Your circle is empty</p>
          <p className="text-sm text-muted-foreground">Invite family and friends to stay connected.</p>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main Family page
// ──────────────────────────────────────────────────────────────
export default function Family() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: members, isLoading: membersLoading } = useListFamilyMembers();
  const createMember = useCreateFamilyMember();
  const updateMember = useUpdateFamilyMember();
  const deleteMember = useDeleteFamilyMember();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<null | number>(null);
  const [form, setForm] = useState(emptyForm);
  const [groupFilter, setGroupFilter] = useState<string>("all");

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(member: any) {
    setEditing(member.id);
    setForm({
      name: member.name,
      relationship: member.relationship,
      groupName: member.groupName ?? "",
      dateOfBirth: member.dateOfBirth ?? "",
      bloodType: member.bloodType ?? "",
      notes: member.notes ?? "",
    });
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name: form.name, relationship: form.relationship,
      groupName: form.groupName || null, dateOfBirth: form.dateOfBirth || null,
      bloodType: form.bloodType || null, notes: form.notes || null,
    };

    if (editing !== null) {
      updateMember.mutate({ id: editing, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFamilyMembersQueryKey() });
          setOpen(false);
          toast({ title: "Updated" });
        },
      });
    } else {
      createMember.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFamilyMembersQueryKey() });
          setOpen(false);
          toast({ title: "Added" });
        },
      });
    }
  }

  function handleDelete(id: number) {
    if (!window.confirm("Remove this profile?")) return;
    deleteMember.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFamilyMembersQueryKey() });
        toast({ title: "Removed" });
      },
    });
  }

  const allGroups = Array.from(new Set((members ?? []).map(m => m.groupName).filter(Boolean))) as string[];
  const filteredMembers = groupFilter === "all" ? (members ?? []) : groupFilter === "none" ? (members ?? []).filter(m => !m.groupName) : (members ?? []).filter(m => m.groupName === groupFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Family & Circle</h1>
          <p className="text-muted-foreground mt-1">Manage family profiles and connect with other users.</p>
        </div>
      </div>

      <Tabs defaultValue="circle" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="circle" className="gap-2">
            <UserCheck className="h-4 w-4" /> Health Circle
          </TabsTrigger>
          <TabsTrigger value="profiles" className="gap-2">
            <Users className="h-4 w-4" /> Managed Profiles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="circle" className="m-0">
          <HealthCircle />
        </TabsContent>

        <TabsContent value="profiles" className="m-0 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant={groupFilter === "all" ? "default" : "outline"} onClick={() => setGroupFilter("all")}>All</Button>
              {allGroups.map(g => (
                <Button key={g} size="sm" variant={groupFilter === g ? "default" : "outline"} onClick={() => setGroupFilter(g)}>{g}</Button>
              ))}
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> Add Profile</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editing !== null ? "Edit Profile" : "Add Managed Profile"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Relationship</Label>
                      <Select value={form.relationship} onValueChange={v => setForm(f => ({ ...f, relationship: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Group</Label>
                      <Input value={form.groupName} onChange={e => setForm(f => ({ ...f, groupName: e.target.value }))} list="existing-groups" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Date of Birth</Label>
                      <Input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Blood Type</Label>
                      <Select value={form.bloodType} onValueChange={v => setForm(f => ({ ...f, bloodType: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{BLOOD_TYPES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createMember.isPending || updateMember.isPending}>Save Profile</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {membersLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filteredMembers.length === 0 ? (
            <Card className="border-dashed py-12 flex flex-col items-center text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-20" />
              <p>No managed profiles yet.</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map(member => (
                <MemberCard key={member.id} member={member} onEdit={openEdit} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

