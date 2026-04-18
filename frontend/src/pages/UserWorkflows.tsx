/**
 * File: UserWorkflows.tsx
 * Author: Hiba Noor
 * 
 * Purpose: Display all workflows for the current user (read-only)
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  GitBranch,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Pause,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

interface Workflow {
  id: number;
  name: string;
  status: "active" | "paused" | "error";
  business_id: string;
  triggers: any[];
  actions: any;
  created_at: string;
}

const UserWorkflows = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchUserAndWorkflows = async () => {
      try {
        // Get current user
        const userRes = await api.get("/api/users/me");
        const userId = userRes.data.id;
        setCurrentUser(userRes.data);
        
        // Get workflows for this user
        const workflowsRes = await api.get(`/workflows/user/${userId}`);
        setWorkflows(workflowsRes.data);
      } catch (error) {
        console.error("Failed to fetch workflows:", error);
        toast({
          title: "Error",
          description: "Could not load your workflows.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserAndWorkflows();
  }, [toast]);

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

  const handleViewWorkflow = (workflowId: number) => {
    navigate(`/workflow-builder?mode=user&workflowId=${workflowId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-workflow/10">
                <GitBranch className="w-6 h-6 text-workflow" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">My Workflows</h1>
                <p className="text-xs text-muted-foreground">
                  {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {workflows.length === 0 ? (
          <div className="text-center py-20">
            <GitBranch className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Workflows Yet</h2>
            <p className="text-muted-foreground mb-6">
              Your administrator hasn't created any workflows for you yet.
            </p>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow, index) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => handleViewWorkflow(workflow.id)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-lg bg-workflow/10">
                        <GitBranch className="w-5 h-5 text-workflow" />
                      </div>
                      {getStatusIcon(workflow.status)}
                    </div>
                    <CardTitle className="mt-4">{workflow.name}</CardTitle>
                    <CardDescription>
                      Created {new Date(workflow.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(workflow.status)}
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default UserWorkflows;