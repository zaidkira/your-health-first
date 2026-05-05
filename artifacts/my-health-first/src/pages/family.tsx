import { useState } from "react";
import { useListFamilyMembers, useCreateFamilyMember, useUpdateFamilyMember, useDeleteFamilyMember, getListFamilyMembersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Pencil, Trash2, Heart } from "lucide-react";
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

const emptyForm = { name: "", relationship: "Spouse", dateOfBirth: "", bloodType: "", notes: "" };

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

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(member: { id: number; name: string; relationship: string; dateOfBirth?: string | null; bloodType?: string | null; notes?: string | null }) {
    setEditing(member.id);
    setForm({ name: member.name, relationship: member.relationship, dateOfBirth: member.dateOfBirth ?? "", bloodType: member.bloodType ?? "", notes: member.notes ?? "" });
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { ...form, dateOfBirth: form.dateOfBirth || null, bloodType: form.bloodType || null, notes: form.notes || null };

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
        { data: { name: form.name, relationship: form.relationship, dateOfBirth: data.dateOfBirth, bloodType: data.bloodType, notes: data.notes } },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Family</h1>
          <p className="text-muted-foreground mt-1">Manage health profiles for your family members.</p>
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
              <div className="space-y-1">
                <Label>Relationship</Label>
                <Select value={form.relationship} onValueChange={v => setForm(f => ({ ...f, relationship: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
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

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (members ?? []).length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-20" />
          <p className="font-medium">No family members yet</p>
          <p className="text-sm mt-1">Add your family members to manage their health profiles.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(members ?? []).map(member => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(member)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(member.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
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
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1 italic">"{member.notes}"</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
