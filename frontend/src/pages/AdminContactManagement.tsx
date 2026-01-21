/**
 * File: AdminContactManagement.tsx
 * Author: Hiba Noor
 *
 * Purpose:
 *   Renders the Admin Contact Management page of BizBot.
 *   This page allows administrators to view, search, and
 *   manage messages submitted through the Contact Us form.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  Calendar,
  Search,
  Download,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BotIcon from "@/components/ui/BotIcon";
import api from "@/lib/api";

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  mobile_number: string | null;
  whatsapp_number: string | null;
  company: string | null;
  subject: string;
  message: string;
  created_at: string;
}

/* -------------------- Helpers -------------------- */

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const filterMessages = (messages: ContactMessage[], query: string) => {
  const q = query.toLowerCase();
  return messages.filter((msg) =>
    [msg.name, msg.email, msg.subject].some((field) =>
      field.toLowerCase().includes(q),
    ),
  );
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-20">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

/* -------------------- Component -------------------- */

const AdminContactManagement = () => {
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMessages = async () => {
    const response = await api.get("/api/contact/");
    return response.data;
  };

  useEffect(() => {
    fetchMessages()
      .then(setMessages)
      .catch((error) => console.error("[Contact Messages Fetch Error]", error))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredMessages = filterMessages(messages, searchQuery);

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
              <BotIcon size="sm" animated={false} />
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  Contact Messages
                </h1>
                <p className="text-xs text-muted-foreground">
                  View and manage inquiries
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
            <div className="space-y-1">
              <CardTitle>Inquiries ({filteredMessages.length})</CardTitle>
              <p className="text-sm text-muted-foreground">
                All messages submitted via the Contact Us form.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Button variant="outline" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User Details</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="w-[300px]">Message</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredMessages.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-10 text-muted-foreground"
                        >
                          No messages found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMessages.map((msg) => (
                        <TableRow
                          key={msg.id}
                          className="hover:bg-accent/30 align-top"
                        >
                          <TableCell className="whitespace-nowrap text-muted-foreground text-sm py-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              {formatDate(msg.created_at)}
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="font-medium text-foreground">
                              {msg.name}
                            </div>
                            {msg.company && (
                              <div className="text-xs text-muted-foreground">
                                {msg.company}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                {msg.email}
                              </div>

                              {msg.mobile_number && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  {msg.mobile_number}
                                </div>
                              )}

                              {msg.whatsapp_number && (
                                <div className="flex items-center gap-2 text-green-600/80">
                                  <MessageCircle className="w-3 h-3" />
                                  {msg.whatsapp_number}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <Badge variant="outline" className="font-normal">
                              {msg.subject}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="text-sm text-muted-foreground leading-relaxed min-w-[300px]">
                              {msg.message}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminContactManagement;
