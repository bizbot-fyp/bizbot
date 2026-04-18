/**
 * File: AdminUserDetail.tsx
 * Author: Hiba Noor
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Plus,
  Edit,
  Trash2,
  Pause,
  Play,
  GitBranch,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const API_URL = "http://localhost:8000";

// Real User interface matching your backend
interface UserData {
  id: number;
  username: string;
  email: string;
  company?: string;
  job_title?: string;
  is_active: boolean;
  profile_picture_url?: string;
  created_at: string;
  roles?: string[];
}

interface Workflow {
  id: number;
  name: string;
  status: "active" | "paused" | "error";
  business_id: string;
  triggers: any[];
  actions: any;
}

const AdminUserDetail = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  // Extract numeric ID for API calls (remove "user-" prefix)
  const numericUserId = userId?.replace("user-", "") || "";
  
  const [userData, setUserData] = useState<UserData | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);

  // ─── Fetch REAL user data from backend API ───────────────────────────
  useEffect(() => {
    if (!numericUserId) return;

    const fetchUserData = async () => {
      setIsLoadingUser(true);
      try {
        const res = await fetch(`${API_URL}/api/users/${numericUserId}`);
        if (!res.ok) throw new Error("Failed to fetch user data");
        const data: UserData = await res.json();
        setUserData(data);
      } catch (err) {
        console.error("Failed to load user data:", err);
        toast({
          title: "Error",
          description: "Could not load user information.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserData();
  }, [numericUserId, toast]);

  // ─── Fetch workflows for this user from backend ───────────────────────────
  useEffect(() => {
    if (!numericUserId) return;

    const fetchWorkflows = async () => {
      setIsLoadingWorkflows(true);
      try {
        const res = await fetch(`${API_URL}/workflows/user/${numericUserId}`);
        if (!res.ok) throw new Error("Failed to fetch workflows");
        const data: Workflow[] = await res.json();
        setWorkflows(data);
      } catch (err) {
        console.error("Failed to load workflows:", err);
        toast({
          title: "Error",
          description: "Could not load workflows for this user.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingWorkflows(false);
      }
    };

    fetchWorkflows();
  }, [numericUserId, toast]);


  // Listen for navigation state to refresh workflows
useEffect(() => {
  // This will re-fetch workflows when the component mounts or when location state changes
  if (!numericUserId) return;

  const fetchWorkflows = async () => {
    setIsLoadingWorkflows(true);
    try {
      const res = await fetch(`${API_URL}/workflows/user/${numericUserId}`);
      if (!res.ok) throw new Error("Failed to fetch workflows");
      const data: Workflow[] = await res.json();
      setWorkflows(data);
    } catch (err) {
      console.error("Failed to load workflows:", err);
      toast({
        title: "Error",
        description: "Could not load workflows for this user.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingWorkflows(false);
    }
  };

  fetchWorkflows();
}, [numericUserId, toast]); 

  // ─── Toggle active ↔ paused via PATCH /workflows/{id}/status ──────────────
  const handleToggleWorkflow = async (workflowId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    try {
      const res = await fetch(
        `${API_URL}/workflows/${workflowId}/status?status=${newStatus}`,
        { method: "PATCH" }
      );
      if (!res.ok) throw new Error("Failed to update workflow");

      setWorkflows((prev) =>
        prev.map((wf) =>
          wf.id === workflowId ? { ...wf, status: newStatus as Workflow["status"] } : wf
        )
      );
      toast({ title: "Workflow Updated", description: `Workflow is now ${newStatus}.` });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not update workflow status.", variant: "destructive" });
    }
  };

  // ─── Delete via DELETE /workflows/{id} ───────────────────────────────────
  const handleDeleteWorkflow = async (workflowId: number) => {
    try {
      const res = await fetch(`${API_URL}/workflows/${workflowId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete workflow");

      setWorkflows((prev) => prev.filter((wf) => wf.id !== workflowId));
      toast({ title: "Workflow Deleted", description: "The workflow has been permanently removed." });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not delete workflow.", variant: "destructive" });
    }
  };

  // ─── Edit: open WorkflowBuilder in admin mode with correct IDs ───────────
  const handleEditWorkflow = (workflowId: number) => {
    navigate(`/workflow-builder?mode=admin&workflowId=${workflowId}&userId=${userId}`);
  };

  // ─── Create: open WorkflowBuilder for this user ───────────────────────────
  const handleCreateWorkflow = () => {
    navigate(`/workflow-builder?mode=admin&new=true&userId=${userId}`);
  };

  // ─── Status helpers ───────────────────────────────────────────────────────
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="w-4 h-4 text-success" />;
      case "paused": return <Pause className="w-4 h-4 text-warning" />;
      case "error": return <AlertCircle className="w-4 h-4 text-destructive" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
      case "paused":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Paused</Badge>;
      case "error":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Show loading state while fetching user data
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // If user not found
  if (!userData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">User Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested user does not exist.</p>
          <Button onClick={() => navigate("/admin")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  Managing: {userData.username}
                </h1>
                <p className="text-xs text-muted-foreground">User Administration</p>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-6 mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={userData.profile_picture_url || `https://ui-avatars.com/api/?name=${userData.username.replace(" ", "+")}&background=6366f1&color=fff&size=200`}
              />
              <AvatarFallback className="text-2xl">
                {userData.username.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-1">{userData.username}</h2>
              <p className="text-muted-foreground mb-2">{userData.email}</p>
              <div className="flex flex-wrap gap-2">
                {userData.company && <Badge variant="secondary">{userData.company}</Badge>}
                {userData.job_title && <Badge variant="outline">{userData.job_title}</Badge>}
                {userData.is_active ? (
                  <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
                {userData.roles && userData.roles.includes("Admin") && (
                  <Badge className="bg-primary/10 text-primary border-primary/20">Admin</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Workflows</p>
              <p className="text-3xl font-bold text-foreground">{workflows.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Member since: {new Date(userData.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Workflows Section */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground">User Workflows</h3>
        </div>

        {isLoadingWorkflows ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* New Workflow Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              className="card-elevated p-6 border-2 border-dashed border-border hover:border-primary cursor-pointer transition-colors"
              onClick={handleCreateWorkflow}
            >
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  <Plus className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">Create New Workflow</h4>
                <p className="text-sm text-muted-foreground">Build a new automation for this user</p>
              </div>
            </motion.div>

            {/* Existing Workflows */}
            {workflows.map((workflow, index) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index + 1) * 0.1 }}
                className="card-elevated-hover overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg bg-workflow/10">
                      <GitBranch className="w-5 h-5 text-workflow" />
                    </div>
                    {getStatusIcon(workflow.status)}
                  </div>

                  <h4 className="text-lg font-semibold text-foreground mb-2">{workflow.name}</h4>

                  <div className="flex items-center gap-2 mb-4">
                    {getStatusBadge(workflow.status)}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditWorkflow(workflow.id)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleWorkflow(workflow.id, workflow.status)}
                    >
                      {workflow.status === "active" ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the workflow
                            "{workflow.name}" and all its data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteWorkflow(workflow.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminUserDetail;