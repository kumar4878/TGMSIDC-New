import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useUsers,
  useRoles,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useInstitutions,
  useVendors,
} from "@/lib/api-hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Shield,
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Building2,
  Phone,
  Mail,
  Edit2,
  UserCheck,
  UserX,
  Layers,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function UsersAndRolesPage() {
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create / Edit modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "deo",
    designation: "",
    department: "",
    email: "",
    phone: "",
    facilityId: "",
    facilityName: "",
    vendorId: "",
    vendorName: "",
  });

  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useUsers();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: institutions = [] } = useInstitutions();
  const { data: vendors = [] } = useVendors();

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const filteredUsers = users.filter((u: any) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (statusFilter === "active" && !u.isActive) return false;
    if (statusFilter === "inactive" && u.isActive) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        u.fullName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.facilityName?.toLowerCase().includes(q) ||
        u.roleLabel?.toLowerCase().includes(q) ||
        u.designation?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleOpenCreate = () => {
    setFormData({
      username: "",
      password: "password123",
      fullName: "",
      role: "deo",
      designation: "Data Entry Operator",
      department: "Hospital Procurement Cell",
      email: "",
      phone: "",
      facilityId: "",
      facilityName: "",
      vendorId: "",
      vendorName: "",
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: "",
      fullName: user.fullName,
      role: user.role,
      designation: user.designation,
      department: user.department,
      email: user.email,
      phone: user.phone,
      facilityId: user.facilityId || "",
      facilityName: user.facilityName || "",
      vendorId: user.vendorId || "",
      vendorName: user.vendorName || "",
    });
    setIsEditOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.fullName.trim() || !formData.email.trim()) {
      toast.error("Please fill in all mandatory fields.");
      return;
    }

    try {
      await createUserMutation.mutateAsync(formData);
      toast.success(`User @${formData.username} created successfully!`);
      setIsCreateOpen(false);
      refetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const payload: any = {
        id: selectedUser.id,
        fullName: formData.fullName,
        role: formData.role,
        designation: formData.designation,
        department: formData.department,
        email: formData.email,
        phone: formData.phone,
        facilityId: formData.facilityId || null,
        facilityName: formData.facilityName || null,
        vendorId: formData.vendorId || null,
        vendorName: formData.vendorName || null,
      };
      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      await updateUserMutation.mutateAsync(payload);
      toast.success(`User updated successfully!`);
      setIsEditOpen(false);
      refetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user.");
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        isActive: !user.isActive,
      });
      toast.success(`User ${user.isActive ? "deactivated" : "activated"} successfully.`);
      refetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status.");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "managing_director":
      case "executive_director":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "gm_equipment":
      case "so_equipment":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "tgmsidc_user":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "consignee":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "deo":
        return "bg-slate-100 text-slate-800 border-slate-300";
      case "vendor":
        return "bg-orange-100 text-orange-800 border-orange-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Users & Roles Management
              </h1>
              <p className="text-sm text-slate-500">
                Administer statewide TGMSIDC official personnel, hospital consignees, DEOs, and suppliers.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchUsers()}
            className="gap-1.5 text-xs h-9 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="gap-1.5 text-xs h-9 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Add New User
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="users" className="gap-2 cursor-pointer">
            <Users className="h-4 w-4" />
            Active Users Directory ({users.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2 cursor-pointer">
            <Shield className="h-4 w-4" />
            Roles & Authority Matrix ({roles.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Users Directory */}
        <TabsContent value="users" className="space-y-4 pt-2">
          {/* Filter Bar */}
          <Card className="border shadow-xs">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search by name, username, facility..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Filter by Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles (Any)</SelectItem>
                    {roles.map((r: any) => (
                      <SelectItem key={r.role} value={r.role}>
                        {r.roleLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-end">
                  <span className="text-xs text-slate-500 font-medium">
                    Showing <strong>{filteredUsers.length}</strong> of {users.length} users
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Role & Level</th>
                    <th className="py-3 px-4">Designation & Dept</th>
                    <th className="py-3 px-4">Facility / Vendor Linkage</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        Loading users directory...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        No users match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u: any) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                              {u.initials || u.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{u.fullName}</p>
                              <p className="text-[11px] text-slate-500 font-mono">@{u.username}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-medium border ${getRoleBadgeColor(
                              u.role
                            )}`}
                          >
                            {u.roleLabel || u.role}
                          </Badge>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800">{u.designation || "—"}</p>
                          <p className="text-[11px] text-slate-500">{u.department || "TGMSIDC"}</p>
                        </td>

                        <td className="py-3 px-4">
                          {u.facilityName ? (
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{u.facilityName}</span>
                            </div>
                          ) : u.vendorName ? (
                            <div className="flex items-center gap-1.5 text-orange-700">
                              <ShieldCheck className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{u.vendorName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Statewide HQ</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-slate-600">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span className="truncate max-w-[170px]">{u.email}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{u.phone}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {u.isActive ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold"
                            >
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold"
                            >
                              Inactive
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(u)}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 cursor-pointer"
                              title="Edit user details"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(u)}
                              className={`h-7 w-7 p-0 cursor-pointer ${
                                u.isActive
                                  ? "text-slate-400 hover:text-rose-600"
                                  : "text-slate-400 hover:text-emerald-600"
                              }`}
                              title={u.isActive ? "Deactivate user" : "Activate user"}
                            >
                              {u.isActive ? (
                                <UserX className="h-3.5 w-3.5" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Roles & Authority Matrix */}
        <TabsContent value="roles" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rolesLoading ? (
              <p className="text-slate-400 col-span-3 text-center py-10">Loading roles matrix...</p>
            ) : (
              roles.map((r: any) => (
                <Card key={r.role} className="border shadow-xs hover:border-emerald-300 transition-colors">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          {r.roleLabel}
                        </CardTitle>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">Code: {r.role}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {r.userCount} {r.userCount === 1 ? "User" : "Users"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3 text-xs">
                    <p className="text-slate-600 text-[11px] leading-relaxed">{r.description}</p>

                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Department / Cell:</span>
                        <span className="font-semibold text-slate-800">{r.department}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Hierarchy Level:</span>
                        <span className="font-semibold text-slate-800">Tier {r.hierarchyLevel}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                        Permission Scopes
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {r.permissions?.map((p: string) => (
                          <Badge
                            key={p}
                            variant="outline"
                            className="text-[10px] py-0 px-1.5 bg-white text-slate-600 border-slate-200"
                          >
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Create User */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-600" />
              Add New User Account
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provision a new official with assigned role, department, and facility linkage.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Username (Required) *</Label>
                <Input
                  required
                  placeholder="e.g. deo_warangal"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Password *</Label>
                <Input
                  required
                  type="password"
                  placeholder="Set initial password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input
                required
                placeholder="e.g. Dr. K. Ramesh Rao"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">System Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => {
                    const r = roles.find((x: any) => x.role === val);
                    setFormData({
                      ...formData,
                      role: val,
                      department: r?.department || formData.department,
                    });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r: any) => (
                      <SelectItem key={r.role} value={r.role}>
                        {r.roleLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Designation *</Label>
                <Input
                  required
                  placeholder="e.g. Biomedical Engineer"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Department *</Label>
              <Input
                required
                placeholder="e.g. Equipment Wing / Hospital Stores"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Official Email *</Label>
                <Input
                  required
                  type="email"
                  placeholder="e.g. ramesh@tgmsidc.telangana.gov.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Phone Number *</Label>
                <Input
                  required
                  placeholder="e.g. +91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Hospital Linkage for Consignee / DEO */}
            {["consignee", "deo"].includes(formData.role) && (
              <div className="space-y-1 pt-1 border-t">
                <Label className="text-xs font-semibold text-emerald-800">
                  Hospital / Consignee Facility Linkage
                </Label>
                <Select
                  value={formData.facilityId}
                  onValueChange={(val) => {
                    const inst = institutions.find((i: any) => i._id === val || i.id === val);
                    setFormData({
                      ...formData,
                      facilityId: val,
                      facilityName: inst?.name || "",
                    });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Hospital / Institution" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((inst: any) => (
                      <SelectItem key={inst._id || inst.id} value={inst._id || inst.id}>
                        {inst.name} ({inst.district})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Vendor Linkage for Vendor Role */}
            {formData.role === "vendor" && (
              <div className="space-y-1 pt-1 border-t">
                <Label className="text-xs font-semibold text-orange-800">
                  Empanelled Supplier Linkage
                </Label>
                <Select
                  value={formData.vendorId}
                  onValueChange={(val) => {
                    const v = vendors.find((x: any) => x._id === val || x.id === val);
                    setFormData({
                      ...formData,
                      vendorId: val,
                      vendorName: v?.name || "",
                    });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Vendor Organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v: any) => (
                      <SelectItem key={v._id || v.id} value={v._id || v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createUserMutation.isPending}
                className="text-xs bg-[#186812] hover:bg-[#1f7e17] text-white cursor-pointer"
              >
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit User */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-emerald-600" />
              Edit User Details: @{selectedUser?.username}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update designation, contact information, role, or institution link.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">System Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => setFormData({ ...formData, role: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r: any) => (
                      <SelectItem key={r.role} value={r.role}>
                        {r.roleLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Designation *</Label>
                <Input
                  required
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Department *</Label>
              <Input
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Phone *</Label>
                <Input
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Change Password (Optional)</Label>
              <Input
                type="password"
                placeholder="Leave blank to keep existing password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* Hospital Linkage */}
            {["consignee", "deo"].includes(formData.role) && (
              <div className="space-y-1 pt-1 border-t">
                <Label className="text-xs font-semibold text-emerald-800">
                  Hospital / Consignee Facility Linkage
                </Label>
                <Select
                  value={formData.facilityId}
                  onValueChange={(val) => {
                    const inst = institutions.find((i: any) => i._id === val || i.id === val);
                    setFormData({
                      ...formData,
                      facilityId: val,
                      facilityName: inst?.name || "",
                    });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Hospital / Institution" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((inst: any) => (
                      <SelectItem key={inst._id || inst.id} value={inst._id || inst.id}>
                        {inst.name} ({inst.district})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateUserMutation.isPending}
                className="text-xs bg-[#186812] hover:bg-[#1f7e17] text-white cursor-pointer"
              >
                {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
