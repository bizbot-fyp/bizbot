/**
 * File: WorkflowBuilder.tsx
 * Author: Hiba Noor
 *
 * Description:
 *   This component implements a visual drag-and-drop workflow builder.
 *   It allows users to create, edit, and connect workflow nodes such as triggers,
 *   actions, conditions, delays, filters, and integrations.For user it is read only
 *   admin will have full access
 */

import { useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  Zap,
  Mail,
  MessageSquare,
  GitBranch,
  BarChart3,
  CheckSquare,
  Clock,
  Link,
  Search,
  Globe,
  Target,
  Users,
  RefreshCw,
  Settings,
  Link2,
  Eye,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface NodePosition {
  x: number;
  y: number;
}

interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  icon: string;
  position: NodePosition;
  color: string;
}

interface Connection {
  from: string;
  to: string;
}

interface NodeTemplate {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

interface WorkflowTemplate {
  name: string;
  icon: React.ReactNode;
  description: string;
  nodes: WorkflowNode[];
  connections: Connection[];
}

interface WorkflowBuilderProps {
  mode?: "user" | "admin";
}

const WorkflowBuilder = ({ mode: propMode }: WorkflowBuilderProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Determine mode from props or URL params
  const urlMode = searchParams.get("mode");
  const mode = propMode || (urlMode === "admin" ? "admin" : "user");
  const isReadOnly = mode === "user";

  const [nodes, setNodes] = useState<WorkflowNode[]>([
    {
      id: "start-1",
      type: "trigger",
      label: "Start",
      icon: "zap",
      position: { x: 100, y: 200 },
      color: "bg-primary",
    },
  ]);

  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [tempConnection, setTempConnection] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      zap: <Zap className="w-4 h-4" />,
      mail: <Mail className="w-4 h-4" />,
      message: <MessageSquare className="w-4 h-4" />,
      branch: <GitBranch className="w-4 h-4" />,
      chart: <BarChart3 className="w-4 h-4" />,
      check: <CheckSquare className="w-4 h-4" />,
      clock: <Clock className="w-4 h-4" />,
      link: <Link className="w-4 h-4" />,
      search: <Search className="w-4 h-4" />,
      globe: <Globe className="w-4 h-4" />,
    };
    return icons[iconName] || <Zap className="w-4 h-4" />;
  };

  const nodeTemplates: NodeTemplate[] = [
    { type: "trigger", label: "Trigger", icon: <Zap className="w-4 h-4" />, color: "bg-primary", description: "Start automation" },
    { type: "action", label: "Send Email", icon: <Mail className="w-4 h-4" />, color: "bg-warning", description: "Send email to contacts" },
    { type: "action", label: "WhatsApp Message", icon: <MessageSquare className="w-4 h-4" />, color: "bg-whatsapp", description: "Send WhatsApp message" },
    { type: "condition", label: "Condition", icon: <GitBranch className="w-4 h-4" />, color: "bg-workflow", description: "Add conditional logic" },
    { type: "action", label: "Update CRM", icon: <BarChart3 className="w-4 h-4" />, color: "bg-info", description: "Update customer data" },
    { type: "action", label: "Create Task", icon: <CheckSquare className="w-4 h-4" />, color: "bg-success", description: "Create new task" },
    { type: "delay", label: "Wait/Delay", icon: <Clock className="w-4 h-4" />, color: "bg-warning", description: "Add time delay" },
    { type: "webhook", label: "Webhook", icon: <Link className="w-4 h-4" />, color: "bg-info", description: "Send/receive webhook" },
    { type: "filter", label: "Filter", icon: <Search className="w-4 h-4" />, color: "bg-warning", description: "Filter data" },
    { type: "integration", label: "API Call", icon: <Globe className="w-4 h-4" />, color: "bg-workflow", description: "External API integration" },
  ];

  const workflowTemplates: WorkflowTemplate[] = [
    {
      name: "Lead Nurturing",
      icon: <Target className="w-4 h-4" />,
      description: "Automated lead follow-up sequence",
      nodes: [
        { id: "start", type: "trigger", label: "New Lead", icon: "zap", position: { x: 100, y: 200 }, color: "bg-primary" },
        { id: "email1", type: "action", label: "Welcome Email", icon: "mail", position: { x: 300, y: 200 }, color: "bg-warning" },
        { id: "delay1", type: "delay", label: "Wait 2 Days", icon: "clock", position: { x: 500, y: 200 }, color: "bg-warning" },
        { id: "email2", type: "action", label: "Follow-up Email", icon: "mail", position: { x: 700, y: 200 }, color: "bg-warning" },
      ],
      connections: [
        { from: "start", to: "email1" },
        { from: "email1", to: "delay1" },
        { from: "delay1", to: "email2" },
      ],
    },
    {
      name: "Client Onboarding",
      icon: <Users className="w-4 h-4" />,
      description: "New client welcome automation",
      nodes: [
        { id: "start", type: "trigger", label: "New Client", icon: "zap", position: { x: 100, y: 150 }, color: "bg-primary" },
        { id: "welcome", type: "action", label: "Welcome Message", icon: "message", position: { x: 300, y: 150 }, color: "bg-whatsapp" },
        { id: "crm", type: "action", label: "Update CRM", icon: "chart", position: { x: 300, y: 300 }, color: "bg-info" },
        { id: "task", type: "action", label: "Create Task", icon: "check", position: { x: 500, y: 225 }, color: "bg-success" },
      ],
      connections: [
        { from: "start", to: "welcome" },
        { from: "start", to: "crm" },
        { from: "welcome", to: "task" },
        { from: "crm", to: "task" },
      ],
    },
    {
      name: "Data Sync",
      icon: <RefreshCw className="w-4 h-4" />,
      description: "Sync data between platforms",
      nodes: [
        { id: "start", type: "trigger", label: "Data Update", icon: "zap", position: { x: 100, y: 200 }, color: "bg-primary" },
        { id: "filter", type: "filter", label: "Filter Data", icon: "search", position: { x: 300, y: 200 }, color: "bg-warning" },
        { id: "api1", type: "integration", label: "Sync Platform A", icon: "globe", position: { x: 500, y: 150 }, color: "bg-workflow" },
        { id: "api2", type: "integration", label: "Sync Platform B", icon: "globe", position: { x: 500, y: 250 }, color: "bg-workflow" },
      ],
      connections: [
        { from: "start", to: "filter" },
        { from: "filter", to: "api1" },
        { from: "filter", to: "api2" },
      ],
    },
  ];

  const addNode = (template: NodeTemplate, position: NodePosition | null = null) => {
    if (isReadOnly) return;
    
    const iconName = template.label.toLowerCase().includes("email")
      ? "mail"
      : template.label.toLowerCase().includes("whatsapp")
      ? "message"
      : template.label.toLowerCase().includes("condition")
      ? "branch"
      : template.label.toLowerCase().includes("crm")
      ? "chart"
      : template.label.toLowerCase().includes("task")
      ? "check"
      : template.label.toLowerCase().includes("delay")
      ? "clock"
      : template.label.toLowerCase().includes("webhook")
      ? "link"
      : template.label.toLowerCase().includes("filter")
      ? "search"
      : template.label.toLowerCase().includes("api")
      ? "globe"
      : "zap";

    const newNode: WorkflowNode = {
      id: `${template.type}-${Date.now()}`,
      type: template.type,
      label: template.label,
      icon: iconName,
      color: template.color,
      position: position || { x: 400, y: 300 },
    };
    setNodes([...nodes, newNode]);
  };

  const loadTemplate = (template: WorkflowTemplate) => {
    if (isReadOnly) return;
    setNodes(template.nodes);
    setConnections(template.connections);
  };

  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    if (isReadOnly) return;
    
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setSelectedNode(nodeId);
    setIsDragging(true);
  };

  const handleNodeDrag = useCallback(
    (e: React.MouseEvent) => {
      if (isReadOnly || !isDragging || !selectedNode || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;

      setNodes((prevNodes) =>
        prevNodes.map((node) =>
          node.id === selectedNode ? { ...node, position: { x, y } } : node
        )
      );
    },
    [isDragging, selectedNode, dragOffset, isReadOnly]
  );

  const handleNodeDragEnd = () => {
    setIsDragging(false);
  };

  const startConnection = (nodeId: string) => {
    if (isReadOnly) return;
    setIsConnecting(true);
    setConnectionStart(nodeId);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isReadOnly || !isConnecting || !connectionStart || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setTempConnection({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const completeConnection = (targetNodeId: string) => {
    if (isReadOnly || !isConnecting || !connectionStart || connectionStart === targetNodeId) {
      setIsConnecting(false);
      setConnectionStart(null);
      setTempConnection(null);
      return;
    }

    const exists = connections.some(
      (conn) => conn.from === connectionStart && conn.to === targetNodeId
    );

    if (!exists) {
      setConnections([...connections, { from: connectionStart, to: targetNodeId }]);
    }

    setIsConnecting(false);
    setConnectionStart(null);
    setTempConnection(null);
  };

  const deleteNode = (nodeId: string) => {
    if (isReadOnly) return;
    setNodes(nodes.filter((n) => n.id !== nodeId));
    setConnections(connections.filter((c) => c.from !== nodeId && c.to !== nodeId));
    setSelectedNode(null);
  };

  const clearCanvas = () => {
    if (isReadOnly) return;
    if (window.confirm("Clear entire workflow?")) {
      setNodes([
        {
          id: "start-1",
          type: "trigger",
          label: "Start",
          icon: "zap",
          position: { x: 100, y: 200 },
          color: "bg-primary",
        },
      ]);
      setConnections([]);
    }
  };

  const saveWorkflow = () => {
    if (isReadOnly) return;
    const workflow = { nodes, connections };
    console.log("Saving workflow:", workflow);
    alert("Workflow saved successfully!");
  };

  const getConnectionPath = (fromNode: WorkflowNode, toNode: WorkflowNode) => {
    const fromX = fromNode.position.x + 75;
    const fromY = fromNode.position.y + 40;
    const toX = toNode.position.x + 75;
    const toY = toNode.position.y + 40;

    const midX = (fromX + toX) / 2;

    return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
  };

  const selectedNodeData = nodes.find((n) => n.id === selectedNode);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-workflow/10">
                <Settings className="w-6 h-6 text-workflow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-foreground">
                    Custom Workflow Builder
                  </h1>
                  {isReadOnly && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      View Only
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isReadOnly ? "Read-Only Mode" : "Drag & Drop Automation"}
                </p>
              </div>
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={saveWorkflow}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Node Palette (hidden in read-only mode) */}
        {!isReadOnly && (
          <aside className="w-72 bg-card border-r border-border overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Node Library
              </h3>
              <div className="space-y-2">
                {nodeTemplates.map((template, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => addNode(template)}
                  >
                    <div className={`p-2 rounded-lg ${template.color} text-white`}>
                      {template.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {template.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <h3 className="text-sm font-semibold text-foreground mt-6 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Templates
              </h3>
              <div className="space-y-2">
                {workflowTemplates.map((template, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => loadTemplate(template)}
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {template.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {template.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Canvas */}
        <div
          ref={canvasRef}
          className={`flex-1 relative bg-[radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)] bg-[length:20px_20px] overflow-hidden ${
            isReadOnly ? "cursor-default" : ""
          }`}
          onMouseMove={(e) => {
            if (!isReadOnly) {
              handleNodeDrag(e);
              handleCanvasMouseMove(e);
            }
          }}
          onMouseUp={handleNodeDragEnd}
          onClick={() => {
            if (!isReadOnly && isConnecting) {
              setIsConnecting(false);
              setConnectionStart(null);
              setTempConnection(null);
            }
          }}
        >
          {/* Read-only overlay banner */}
          {isReadOnly && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/90 backdrop-blur border border-border rounded-full shadow-lg">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  This workflow is in view-only mode
                </span>
              </div>
            </div>
          )}

          {/* SVG for connections */}
          <svg className="absolute inset-0 pointer-events-none w-full h-full">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="hsl(var(--primary))" />
              </marker>
            </defs>

            {connections.map((conn, index) => {
              const fromNode = nodes.find((n) => n.id === conn.from);
              const toNode = nodes.find((n) => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              return (
                <path
                  key={index}
                  d={getConnectionPath(fromNode, toNode)}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  className={`${
                    isReadOnly
                      ? ""
                      : "pointer-events-auto cursor-pointer hover:stroke-destructive transition-colors"
                  }`}
                  onClick={(e) => {
                    if (isReadOnly) return;
                    e.stopPropagation();
                    if (window.confirm("Delete this connection?")) {
                      setConnections(
                        connections.filter((c) => !(c.from === conn.from && c.to === conn.to))
                      );
                    }
                  }}
                />
              );
            })}

            {!isReadOnly && isConnecting && connectionStart && tempConnection && (
              <line
                x1={nodes.find((n) => n.id === connectionStart)!.position.x + 75}
                y1={nodes.find((n) => n.id === connectionStart)!.position.y + 40}
                x2={tempConnection.x}
                y2={tempConnection.y}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.6"
              />
            )}
          </svg>

          {/* Render nodes */}
          {nodes.map((node) => (
            <motion.div
              key={node.id}
              className={`absolute w-[150px] select-none ${
                isReadOnly ? "cursor-default" : "cursor-move"
              } ${selectedNode === node.id ? "z-10" : "z-0"}`}
              style={{
                left: node.position.x,
                top: node.position.y,
              }}
              onMouseDown={(e) => {
                if (!isReadOnly) {
                  e.stopPropagation();
                  handleNodeDragStart(e, node.id);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!isReadOnly && isConnecting) {
                  completeConnection(node.id);
                } else {
                  setSelectedNode(node.id);
                }
              }}
            >
              <div
                className={`rounded-lg border-2 bg-card shadow-lg overflow-hidden transition-all ${
                  selectedNode === node.id
                    ? "border-primary shadow-glow"
                    : "border-border"
                }`}
              >
                <div
                  className={`${node.color} text-white px-3 py-1.5 flex items-center gap-2`}
                >
                  {getIconComponent(node.icon)}
                  <span className="text-xs font-medium capitalize">
                    {node.type}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-foreground text-center">
                    {node.label}
                  </p>
                </div>
                {!isReadOnly && (
                  <div className="flex justify-center gap-2 px-3 pb-2">
                    <button
                      className="p-1 rounded hover:bg-accent transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        startConnection(node.id);
                      }}
                      title="Create connection"
                    >
                      <Link2 className="w-4 h-4 text-primary" />
                    </button>
                    {node.type !== "trigger" && (
                      <button
                        className="p-1 rounded hover:bg-destructive/10 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNode(node.id);
                        }}
                        title="Delete node"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Canvas guide */}
          {nodes.length === 1 && !isReadOnly && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center p-8 bg-card/80 backdrop-blur rounded-xl border border-border">
                <ArrowLeft className="w-8 h-8 text-muted-foreground mx-auto mb-4 rotate-180" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Start Building Your Workflow
                </h3>
                <p className="text-sm text-muted-foreground">
                  Click nodes from the left panel or use templates
                </p>
                <p className="text-sm text-muted-foreground">
                  Connect nodes by clicking the link button
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Properties Panel */}
        <aside className="w-72 bg-card border-l border-border overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Properties
              {isReadOnly && (
                <Badge variant="outline" className="ml-auto text-xs">
                  Read Only
                </Badge>
              )}
            </h3>

            {selectedNodeData ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Node Type</Label>
                  <div className="p-2 bg-accent rounded-lg text-sm capitalize">
                    {selectedNodeData.type}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="node-label">Label</Label>
                  <Input
                    id="node-label"
                    value={selectedNodeData.label}
                    onChange={(e) => {
                      if (isReadOnly) return;
                      setNodes(
                        nodes.map((n) =>
                          n.id === selectedNode ? { ...n, label: e.target.value } : n
                        )
                      );
                    }}
                    disabled={isReadOnly}
                    className={isReadOnly ? "bg-muted cursor-not-allowed" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Position</Label>
                  <div className="p-2 bg-accent rounded-lg text-sm">
                    X: {Math.round(selectedNodeData.position.x)}, Y:{" "}
                    {Math.round(selectedNodeData.position.y)}
                  </div>
                </div>

                {selectedNodeData.type === "action" && (
                  <div className="space-y-2">
                    <Label>Action Configuration</Label>
                    <Textarea
                      placeholder="Configure action parameters..."
                      rows={4}
                      disabled={isReadOnly}
                      className={isReadOnly ? "bg-muted cursor-not-allowed" : ""}
                    />
                  </div>
                )}

                {selectedNodeData.type === "condition" && (
                  <div className="space-y-2">
                    <Label>Condition Logic</Label>
                    <Select defaultValue="equals" disabled={isReadOnly}>
                      <SelectTrigger className={isReadOnly ? "bg-muted cursor-not-allowed" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">If field equals value</SelectItem>
                        <SelectItem value="contains">If field contains text</SelectItem>
                        <SelectItem value="greater">If field is greater than</SelectItem>
                        <SelectItem value="less">If field is less than</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedNodeData.type === "delay" && (
                  <div className="space-y-2">
                    <Label>Delay Duration</Label>
                    <Input
                      type="number"
                      placeholder="Minutes"
                      disabled={isReadOnly}
                      className={isReadOnly ? "bg-muted cursor-not-allowed" : ""}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Settings className="w-8 h-8 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Select a node to {isReadOnly ? "view" : "edit"} properties
                </p>
              </div>
            )}

            <div className="mt-8 p-4 bg-accent/50 rounded-lg">
              <h4 className="text-sm font-semibold text-foreground mb-3">
                Workflow Stats
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Nodes:</span>
                  <span className="font-medium">{nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connections:</span>
                  <span className="font-medium">{connections.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium text-success flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default WorkflowBuilder;
