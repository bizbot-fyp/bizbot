/**
 * File: AdminUserDetail.tsx
 * Author: Hiba Noor
 *
 * Purpose:
 *   Renders the detailed view for a specific user in BizBot Admin Dashboard.
 *   Allows admin to view user info, manage workflows, and perform actions
 *   such as editing, pausing, or deleting workflows. Includes mock data
 *   for demonstration; real user data would be fetched via API in production.
 */

import { useState } from "react";
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
import BotIcon from "@/components/ui/BotIcon";

// Mock user data (in real app would fetch based on ID)
const mockUserData: Record<
  string,
  { name: string; email: string; company: string; status: string }
> = {
  "user-1": {
    name: "John Doe",
    email: "john.doe@acme.com",
    company: "Acme Inc.",
    status: "active",
  },
  "user-2": {
    name: "Sarah Johnson",
    email: "sarah.j@techcorp.io",
    company: "TechCorp",
    status: "active",
  },
  "user-3": {
    name: "Michael Chen",
    email: "m.chen@innovate.co",
    company: "Innovate Co",
    status: "inactive",
  },
  "user-4": {
    name: "Emily Davis",
    email: "emily.d@startup.io",
    company: "StartupIO",
    status: "active",
  },
  "user-5": {
    name: "Alex Thompson",
    email: "alex.t@enterprise.com",
    company: "Enterprise Ltd",
    status: "pending",
  },
  "user-6": {
    name: "Lisa Wang",
    email: "lisa.wang@globaltech.com",
    company: "GlobalTech",
    status: "active",
  },
};

interface Workflow {
  id: string;
  name: string;
  status: "active" | "paused" | "error";
  lastRun: string;
  runs: number;
  type: string;
}

const AdminUserDetail = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const userData =
    userId && mockUserData[userId]
      ? mockUserData[userId]
      : {
          name: "Unknown User",
          email: "unknown@email.com",
          company: "Unknown",
          status: "inactive",
        };

  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: "wf-1",
      name: "Lead Nurturing Sequence",
      status: "active",
      lastRun: "2 hours ago",
      runs: 1243,
      type: "Email Automation",
    },
    {
      id: "wf-2",
      name: "Client Onboarding",
      status: "active",
      lastRun: "5 hours ago",
      runs: 567,
      type: "Multi-channel",
    },
    {
      id: "wf-3",
      name: "Support Ticket Routing",
      status: "paused",
      lastRun: "3 days ago",
      runs: 2341,
      type: "WhatsApp + Email",
    },
    {
      id: "wf-4",
      name: "Weekly Report Generator",
      status: "error",
      lastRun: "1 day ago",
      runs: 52,
      type: "Scheduled Task",
    },
  ]);

  const handleToggleWorkflow = (workflowId: string) => {
    setWorkflows((prev) =>
      prev.map((wf) =>
        wf.id === workflowId
          ? { ...wf, status: wf.status === "active" ? "paused" : "active" }
          : wf,
      ),
    );
    toast({
      title: "Workflow Updated",
      description: "The workflow status has been changed.",
    });
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    setWorkflows((prev) => prev.filter((wf) => wf.id !== workflowId));
    toast({
      title: "Workflow Deleted",
      description: "The workflow has been permanently removed.",
    });
  };

  const handleEditWorkflow = (workflowId: string) => {
    navigate(`/workflow-builder?mode=admin&workflowId=${workflowId}`);
  };

  const handleCreateWorkflow = () => {
    navigate("/workflow-builder?mode=admin&new=true");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "paused":
        return <Pause className="w-4 h-4 text-warning" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            Active
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            Paused
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            Error
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  Managing: {userData.name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  User Administration
                </p>
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
                src={`https://ui-avatars.com/api/?name=${userData.name.replace(" ", "+")}&background=6366f1&color=fff&size=200`}
              />
              <AvatarFallback className="text-2xl">
                {userData.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {userData.name}
              </h2>
              <p className="text-muted-foreground mb-2">{userData.email}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{userData.company}</Badge>
                {userData.status === "active" && (
                  <Badge className="bg-success/10 text-success border-success/20">
                    Active
                  </Badge>
                )}
                {userData.status === "inactive" && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
                {userData.status === "pending" && (
                  <Badge className="bg-warning/10 text-warning border-warning/20">
                    Pending
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Workflows</p>
              <p className="text-3xl font-bold text-foreground">
                {workflows.length}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Workflows Section */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground">
            User Workflows
          </h3>
        </div>

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
              <h4 className="text-lg font-semibold text-foreground mb-2">
                Create New Workflow
              </h4>
              <p className="text-sm text-muted-foreground">
                Build a new automation for this user
              </p>
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

                <h4 className="text-lg font-semibold text-foreground mb-2">
                  {workflow.name}
                </h4>

                <div className="flex items-center gap-2 mb-4">
                  {getStatusBadge(workflow.status)}
                  <Badge variant="outline">{workflow.type}</Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {workflow.lastRun}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      {workflow.runs}
                    </span>{" "}
                    runs
                  </div>
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
                    onClick={() => handleToggleWorkflow(workflow.id)}
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
                          This action cannot be undone. This will permanently
                          delete the workflow "{workflow.name}" and all its
                          data.
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
      </main>
    </div>
  );
};

export default AdminUserDetail;
