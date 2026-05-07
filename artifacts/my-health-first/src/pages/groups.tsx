import { useState } from "react";
import {
  useListGroups, useCreateGroup, useGetGroup, useDeleteGroup,
  useInviteToGroup, useRemoveMember, useListGroupMessages,
  useSendGroupMessage, getListGroupsQueryKey, getGetGroupQueryKey,
  getListGroupMessagesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  Users, Plus, Trash2, UserPlus, MessageSquare, Send,
  ArrowLeft, Shield, UserMinus, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Groups() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [messageContent, setMessageContent] = useState("");

  const { data: groups, isLoading: groupsLoading } = useListGroups();
  const { data: groupDetail } = useGetGroup(selectedGroupId ?? 0, { query: { enabled: !!selectedGroupId } });
  const { data: messages } = useListGroupMessages(selectedGroupId ?? 0, { query: { enabled: !!selectedGroupId, refetchInterval: 5000 } });

  const createGroup = useCreateGroup();
  const deleteGroup = useDeleteGroup();
  const inviteUser = useInviteToGroup();
  const removeMember = useRemoveMember();
  const sendMessage = useSendGroupMessage();

  const isAdmin = groupDetail?.createdById === user?.id;

  function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    createGroup.mutate(
      { data: groupForm },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          setCreateOpen(false);
          setGroupForm({ name: "", description: "" });
          toast({ title: "Group created successfully" });
        },
        onError: () => toast({ title: "Failed to create group", variant: "destructive" }),
      }
    );
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroupId || !inviteEmail) return;
    inviteUser.mutate(
      { id: selectedGroupId, data: { email: inviteEmail } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(selectedGroupId) });
          setInviteOpen(false);
          setInviteEmail("");
          toast({ title: "Invitation sent" });
        },
        onError: (err: any) => toast({ title: "Failed to invite user", description: err.response?.data?.error || "User not found", variant: "destructive" }),
      }
    );
  }

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroupId || !messageContent.trim()) return;
    sendMessage.mutate(
      { id: selectedGroupId, data: { content: messageContent } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGroupMessagesQueryKey(selectedGroupId) });
          setMessageContent("");
        },
      }
    );
  }

  function handleDeleteGroup() {
    if (!selectedGroupId || !window.confirm("Are you sure you want to delete this group?")) return;
    deleteGroup.mutate(
      { id: selectedGroupId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          setSelectedGroupId(null);
          toast({ title: "Group deleted" });
        },
      }
    );
  }

  function handleRemoveMember(userId: number) {
    if (!selectedGroupId || !window.confirm("Remove this member?")) return;
    removeMember.mutate(
      { groupId: selectedGroupId, userId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(selectedGroupId) });
          toast({ title: "Member removed" });
        },
      }
    );
  }

  if (selectedGroupId && groupDetail) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedGroupId(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{groupDetail.name}</h1>
              <p className="text-sm text-muted-foreground">{groupDetail.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <UserPlus className="h-4 w-4" /> Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Invite to {groupDetail.name}</DialogTitle></DialogHeader>
                <form onSubmit={handleInvite} className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <Label>User Email</Label>
                    <Input 
                      type="email" 
                      placeholder="patient@example.com" 
                      value={inviteEmail} 
                      onChange={e => setInviteEmail(e.target.value)} 
                      required 
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={inviteUser.isPending}>
                    {inviteUser.isPending ? "Inviting..." : "Send Invitation"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            {isAdmin && (
              <Button variant="destructive" size="sm" onClick={handleDeleteGroup}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
          <Card className="lg:col-span-3 flex flex-col h-full overflow-hidden">
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Shared Discussion
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {(messages ?? []).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages?.map(m => (
                      <div key={m.id} className={`flex flex-col ${m.userId === user?.id ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{m.userName}</span>
                          <span className="text-[10px] text-muted-foreground">{format(parseISO(m.createdAt), "HH:mm")}</span>
                        </div>
                        <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                          m.userId === user?.id 
                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                            : "bg-muted rounded-tl-none"
                        }`}>
                          <p className="text-sm">{m.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <div className="p-4 border-t bg-background">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input 
                    placeholder="Type a message..." 
                    value={messageContent} 
                    onChange={e => setMessageContent(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!messageContent.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          <Card className="hidden lg:flex flex-col h-full overflow-hidden">
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Members ({groupDetail.members?.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-3">
                  {groupDetail.members?.map(m => (
                    <div key={m.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[10px]">{m.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{m.name}</p>
                          {m.id === groupDetail.createdById && (
                            <Badge variant="outline" className="text-[9px] px-1 h-3.5 border-primary/30 text-primary">Admin</Badge>
                          )}
                        </div>
                      </div>
                      {isAdmin && m.id !== user?.id && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(m.id)}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patient Groups</h1>
          <p className="text-muted-foreground mt-1">Connect with others, share health tips, and find support.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Create Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Group</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Group Name</Label>
                <Input 
                  placeholder="e.g. Diabetes Support Algeria" 
                  value={groupForm.name} 
                  onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} 
                  required 
                />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea 
                  placeholder="What is this group about?" 
                  value={groupForm.description} 
                  onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))} 
                  rows={3} 
                />
              </div>
              <Button type="submit" className="w-full" disabled={createGroup.isPending}>
                {createGroup.isPending ? "Creating..." : "Create Group"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {groupsLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading groups...</div>
      ) : (groups ?? []).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium">You aren't in any groups yet</p>
            <p className="text-sm mt-1 mb-4 text-center max-w-xs">Create your own group or ask someone to invite you to theirs.</p>
            <Button variant="outline" onClick={() => setCreateOpen(true)}>Get Started</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups?.map(group => (
            <Card 
              key={group.id} 
              className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary"
              onClick={() => setSelectedGroupId(group.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" /> {group.memberCount}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">{group.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Info className="h-3 w-3" /> Created {format(parseISO(group.createdAt), "MMM d, yyyy")}
                  </span>
                  {group.createdById === user?.id && (
                    <span className="flex items-center gap-1 font-medium text-primary">
                      <Shield className="h-3 w-3" /> You are Admin
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Open Group
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
