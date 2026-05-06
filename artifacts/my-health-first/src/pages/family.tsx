import { useState } from "react";
import {
  useListFamilyMembers, useCreateFamilyMember, useUpdateFamilyMember,
  useDeleteFamilyMember, getListFamilyMembersQueryKey,
  useListEmergencyContacts, useCreateEmergencyContact, useUpdateEmergencyContact,
  useDeleteEmergencyContact, getListEmergencyContactsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Pencil, Trash2, Heart, Tag, Phone, AlertTriangle, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const RELATIONSHIPS = ["Spouse", "Parent", "Child", "Sibling", "Grandparent", "Grandchild", "Other"];
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const CONTACT_RELATIONSHIPS = ["Spouse", "Parent", "Child", "Sibling", "Doctor", "Neighbor", "Friend", "Other"];

const emptyForm = { name: "", relationship: "Spouse", groupName: "", dateOfBirth: "", bloodType: "", notes: "" };
const emptyContactForm = { name: "", phone: "", relationship: "Spouse", notes: "" };

// ──────────────────────────────────────────────────────────────
// Emergency contacts panel (rendered inside each member card)
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
// Family member card with collapsible emergency contacts
// ──────────────────────────────────────────────────────────────
function MemberCard({
  member,
  onEdit,
  onDelete,
}: {
  member: {
    id: number; name: string; relationship: string; groupName?: string | null;
    bloodType?: string | null; dateOfBirth?: string | null; notes?: string | null;
  };
  onEdit: (m: typeof member) => void;
  onDelete: (id: number) => void;
}) {
  const [showContacts, setShowContacts] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
              {member.name.charAt(0)}
            </div>
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
        {member.dateOfBirth && (
          <p className="text-sm text-muted-foreground">Born: {member.dateOfBirth}</p>
        )}
        {member.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2 italic">"{member.notes}"</p>
        )}

        {/* Toggle emergency contacts */}
        <button
          className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium mt-1 transition-colors"
          onClick={() => setShowContacts(v => !v)}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Emergency Contacts
          {showContacts ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
        </button>

        {showContacts && (
          <EmergencyContactsPanel memberId={member.id} memberName={member.name} />
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// Main Family page
// ──────────────────────────────────────────────────────────────
export default function Family() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: members, isLoading } = useListFamilyMembers();
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

  function openEdit(member: {
    id: number; name: string; relationship: string; groupName?: string | null;
    dateOfBirth?: string | null; bloodType?: string | null; notes?: string | null;
  }) {
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
      name: form.name,
      relationship: form.relationship,
      groupName: form.groupName || null,
      dateOfBirth: form.dateOfBirth || null,
      bloodType: form.bloodType || null,
      notes: form.notes || null,
    };

    if (editing !== null) {
      updateMember.mutate(
        { id: editing, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListFamilyMembersQueryKey() });
            setOpen(false);
            toast({ title: "Family member updated" });
          },
          onError: () => toast({ title: "Failed to update", variant: "destructive" }),
        }
      );
    } else {
      createMember.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListFamilyMembersQueryKey() });
            setOpen(false);
            toast({ title: "Family member added" });
          },
          onError: () => toast({ title: "Failed to add", variant: "destructive" }),
        }
      );
    }
  }

  function handleDelete(id: number) {
    deleteMember.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFamilyMembersQueryKey() });
          toast({ title: "Family member removed" });
        },
        onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
      }
    );
  }

  const isPending = createMember.isPending || updateMember.isPending;
  const allGroups = Array.from(new Set((members ?? []).map(m => m.groupName).filter(Boolean))) as string[];
  const filteredMembers = groupFilter === "all"
    ? (members ?? [])
    : groupFilter === "none"
      ? (members ?? []).filter(m => !m.groupName)
      : (members ?? []).filter(m => m.groupName === groupFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Family</h1>
          <p className="text-muted-foreground mt-1">Manage health profiles and emergency contacts for your family.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" />Add Member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing !== null ? "Edit Family Member" : "Add Family Member"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
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
                  <Label>Group (optional)</Label>
                  <Input
                    placeholder="e.g. Immediate, Extended"
                    value={form.groupName}
                    onChange={e => setForm(f => ({ ...f, groupName: e.target.value }))}
                    list="existing-groups"
                  />
                  <datalist id="existing-groups">
                    {allGroups.map(g => <option key={g} value={g} />)}
                  </datalist>
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
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{BLOOD_TYPES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea placeholder="Any health conditions, allergies..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : editing !== null ? "Update" : "Add Member"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Group filter chips */}
      {allGroups.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={groupFilter === "all" ? "default" : "outline"} onClick={() => setGroupFilter("all")}>All</Button>
          {allGroups.map(g => (
            <Button key={g} size="sm" variant={groupFilter === g ? "default" : "outline"} onClick={() => setGroupFilter(g)}>{g}</Button>
          ))}
          <Button size="sm" variant={groupFilter === "none" ? "default" : "outline"} onClick={() => setGroupFilter("none")}>No Group</Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-20" />
          <p className="font-medium">No family members yet</p>
          <p className="text-sm mt-1">Add your family members to manage their health profiles and emergency contacts.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map(member => (
            <MemberCard key={member.id} member={member} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
