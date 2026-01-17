import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  Activity,
  Server,
  TrendingUp,
  Search,
  MoreVertical,
  ChevronRight,
  LogOut,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import BotIcon from "@/components/ui/BotIcon";
import api from "@/lib/api"; // Import API client

// --- Mock Data ---
const userGrowthData = [
  { month: "Jan", users: 120 },
  { month: "Feb", users: 180 },
  { month: "Mar", users: 250 },
  { month: "Apr", users: 340 },
  { month: "May", users: 420 },
  { month: "Jun", users: 580 },
  { month: "Jul", users: 720 },
];

const systemHealthData = [
  { name: "Healthy", value: 78, color: "hsl(142, 76%, 36%)" },
  { name: "Warning", value: 15, color: "hsl(38, 92%, 50%)" },
  { name: "Critical", value: 7, color: "hsl(0, 84%, 60%)" },
];

const automationVolumeData = [
  { day: "Mon", workflows: 145 },
  { day: "Tue", workflows: 230 },
  { day: "Wed", workflows: 198 },
  { day: "Thu", workflows: 280 },
  { day: "Fri", workflows: 320 },
  { day: "Sat", workflows: 110 },
  { day: "Sun", workflows: 85 },
];

// Existing Dummy Users
const mockUsers = [
  {
    id: "user-1",
    name: "John Doe",
    email: "john.doe@acme.com",
    company: "Acme Inc.",
    status: "active",
    lastLogin: "2 hours ago",
    workflows: 12,
  },
  {
    id: "user-2",
    name: "Sarah Johnson",
    email: "sarah.j@techcorp.io",
    company: "TechCorp",
    status: "active",
    lastLogin: "5 hours ago",
    workflows: 8,
  },
  {
    id: "user-3",
    name: "Michael Chen",
    email: "m.chen@innovate.co",
    company: "Innovate Co",
    status: "inactive",
    lastLogin: "3 days ago",
    workflows: 5,
  },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>(mockUsers); // Start with mocks

  // --- NEW: Fetch Real Users ---
  useEffect(() => {
    const fetchRealUsers = async () => {
      try {
        const response = await api.get("/api/users/");
        
        // Transform API data to match table structure
        const realUsers = response.data.map((u: any) => ({
          id: u.id.toString(), // Ensure ID is string for consistency
          name: u.username,
          email: u.email,
          company: u.company || "Individual User", // Fallback if empty
          status: u.is_active ? "active" : "inactive",
          lastLogin: new Date(u.created_at).toLocaleDateString(), // Use creation date for now
          workflows: 0, // Placeholder as we don't have this count yet
          isReal: true // Flag to identify real users if needed
        }));

        // Combine Mock + Real (Filter out potential duplicates if needed)
        setAllUsers([...mockUsers, ...realUsers]);
        
      } catch (error) {
        console.error("Failed to fetch real users", error);
      }
    };

    fetchRealUsers();
  }, []);

  const filteredUsers = allUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Update metrics based on real data count
  const metricCards = [
    {
      title: "Total Users",
      value: allUsers.length.toString(), // Dynamic count
      change: "+12%",
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Active Sessions",
      value: "156",
      change: "+8%",
      icon: Activity,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "System Uptime",
      value: "99.9%",
      change: "+0.1%",
      icon: Server,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: "Daily Automations",
      value: "1,368",
      change: "+23%",
      icon: TrendingUp,
      color: "text-workflow",
      bgColor: "bg-workflow/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">
                  System Management & Analytics
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 hidden sm:flex"
              onClick={() => navigate("/admin/contacts")}
            >
              <Mail className="w-4 h-4" />
              Contact Messages
            </Button>

            <BotIcon size="sm" animated={false} />
            <span className="text-sm font-medium text-muted-foreground hidden sm:block">
              Mission Control
            </span>
            <div className="h-6 w-px bg-border hidden sm:block mx-2"></div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metricCards.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card-elevated p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                  <metric.icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                <span className="text-sm font-medium text-success flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {metric.change}
                </span>
              </div>
              <h3 className="text-sm text-muted-foreground mb-1">
                {metric.title}
              </h3>
              <p className="text-2xl font-bold text-foreground">{metric.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* User Growth Line Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card-elevated p-6 lg:col-span-1"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">
              User Growth
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* System Health Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card-elevated p-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">
              System Health
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={systemHealthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {systemHealthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-muted-foreground text-sm">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Automation Volume Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card-elevated p-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Automation Volume
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={automationVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="workflows"
                    fill="hsl(var(--workflow))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* User Management Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card-elevated"
        >
          <div className="p-6 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-semibold text-foreground">
                User Management
              </h3>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Joined / Last Login</TableHead>
                <TableHead className="hidden lg:table-cell">Workflows</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="cursor-pointer hover:bg-accent/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={`https://ui-avatars.com/api/?name=${user.name.replace(" ", "+")}&background=6366f1&color=fff`}
                        />
                        <AvatarFallback>
                          {user.name.split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {user.company}
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {user.lastLogin}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="font-medium">{user.workflows}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate(`/admin/user/${user.id}`)}
                        >
                          <ChevronRight className="w-4 h-4 mr-2" />
                          Manage User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminDashboard;