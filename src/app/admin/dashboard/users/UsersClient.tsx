import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Check,
  Copy,
  Edit,
  Loader2,
  MoreHorizontal,
  PlusCircle,
  Search,
  Trash2,
  User as UserIcon,
  UserPlus,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmPasswordDialog from "@/components/ConfirmPasswordDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserForm } from "@/components/landing/user-form";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { verifyAdminPassword } from "@/lib/admin";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User, Batch, UserFormResult } from "@/lib/types";
import { createUser, updateUser, deleteUser } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

interface UsersClientProps {
  initialUsers: User[];
}

// Dialog to show newly created user's credentials
function NewUserCredentialsDialog({
  user,
  open,
  onOpenChange,
}: {
  user: (User & { pass: string }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copiedRoll, setCopiedRoll] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  if (!user) return null;

  const copyToClipboard = (text: string, type: "roll" | "pass") => {
    navigator.clipboard.writeText(text);
    if (type === "roll") {
      setCopiedRoll(true);
      setTimeout(() => setCopiedRoll(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>নতুন ব্যবহারকারী তৈরি হয়েছে</DialogTitle>
          <DialogDescription>
            ব্যবহারকারী নিম্নলিখিত তথ্য দিয়ে তৈরি করা হয়েছে। অনুগ্রহ করে এই তথ্য ব্যবহারকারীর সাথে শেয়ার করুন।
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>নাম</Label>
            <Input value={user.name} readOnly />
          </div>
          <div className="space-y-2">
            <Label>রোল নম্বর</Label>
            <div className="flex items-center gap-2">
              <Input value={user.roll || ""} readOnly className="font-mono" />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(user.roll || "", "roll")}
              >
                {copiedRoll ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>পাসওয়ার্ড</Label>
            <div className="flex items-center gap-2">
              <Input value={user.pass} readOnly className="font-mono" />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(user.pass, "pass")}
              >
                {copiedPass ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>বন্ধ করুন</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersClient({ initialUsers }: UsersClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUserCredentials, setNewUserCredentials] = useState<(User & { pass: string }) | null>(
    null,
  );
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const { toast } = useToast();
  const router = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };

  const openDeleteConfirm = (user: User) => {
    setUserToDelete(user);
    setIsPasswordOpen(true);
  };

  const { admin } = useAdminAuth();

  const deleteMutation = useMutation({
    mutationFn: async (password: string) => {
      if (!userToDelete || !admin) throw new Error("Missing info");

      const ok = await verifyAdminPassword(admin.uid, password);
      if (!ok) throw new Error("ভুল পাসওয়ার্ড");

      const formData = new FormData();
      formData.append("uid", userToDelete.uid);
      const res = await deleteUser(formData);
      if (!res.success) throw new Error(res.message);
      return userToDelete.uid;
    },
    onSuccess: (deletedUid) => {
      setUsers(users.filter((user) => user.uid !== deletedUid));
      toast({
        title: "সফল",
        description: `ব্যবহারকারী মুছে ফেলা হয়েছে।`,
      });
      setIsPasswordOpen(false);
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "ব্যর্থ হয়েছে",
        description: error.message,
      });
    },
  });

  const handleDeleteUserConfirmed = (password: string) => {
    deleteMutation.mutate(password);
  };

  const handleFormSuccess = (data?: User | UserFormResult | null) => {
    setIsUserDialogOpen(false);

    if (!data) return;

    if (!selectedUser && "pass" in data && data.pass) {
      // Create mode
      setNewUserCredentials(data as User & { pass: string });
      setUsers((prev) => [...prev, data as User]);
      toast({
        title: "সফল",
        description: "নতুন ব্যবহারকারী সফলভাবে তৈরি হয়েছে।",
      });
    } else if (selectedUser && "uid" in data) {
      // Edit mode
      setUsers((prev) => prev.map((u) => (u.uid === data.uid ? (data as User) : u)));
      toast({
        title: "সফল",
        description: "ব্যবহারকারী সফলভাবে আপডেট করা হয়েছে।",
      });
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (searchTerm) {
      params.set("search", searchTerm);
    } else {
      params.delete("search");
    }
    router(`/admin/dashboard/users?${params.toString()}`);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
            <div>
              <CardTitle>ব্যবহারকারীগণ</CardTitle>
              <CardDescription>আপনার প্ল্যাটফর্মে সমস্ত নিবন্ধিত ব্যবহারকারীদের পরিচালনা করুন।</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="নাম বা রোল দিয়ে খুঁজুন..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button type="submit" size="icon" variant="outline" className="shrink-0 h-9 w-9">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.length > 0 ? (
              users.map((user) => (
                <Card key={user.uid} className="flex flex-col">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar>
                      <AvatarFallback>
                        <UserIcon className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-muted-foreground">রোল: {user.roll}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>কার্যক্রম</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>সম্পাদনা</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => openDeleteConfirm(user)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>মুছে ফেলুন</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-10">
                <p>কোনো ব্যবহারকারী পাওয়া যায়নি।</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmPasswordDialog
        open={isPasswordOpen}
        onOpenChange={(open) => {
          setIsPasswordOpen(open);
          if (!open) setUserToDelete(null);
        }}
        title="ব্যবহারকারী মুছে ফেলা নিশ্চিত করুন"
        description={
          userToDelete
            ? `আপনি ${userToDelete.name} (রোল: ${userToDelete.roll}) কে মুছে ফেলতে চলেছেন। এই কাজটি необратиযোগ্য। আপনার অ্যাডমিন পাসওয়ার্ড দিন:`
            : undefined
        }
        confirmLabel="মুছে ফেলুন"
        onConfirm={handleDeleteUserConfirmed}
      />

      <NewUserCredentialsDialog
        user={newUserCredentials}
        open={!!newUserCredentials}
        onOpenChange={(open) => {
          if (!open) {
            setNewUserCredentials(null);
          }
        }}
      />
    </>
  );
}
