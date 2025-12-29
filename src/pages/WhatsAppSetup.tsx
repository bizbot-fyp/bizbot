import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  FileText,
  FileSpreadsheet,
  File,
  X,
  Sparkles,
  Brain,
  Globe,
  BarChart3,
  Shield,
  HelpCircle,
  Check,
  Loader2,
  MessageSquare,
  Search,
  Paperclip,
  Send,
  Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface FileItem {
  id: number;
  name: string;
  size: string;
  type: string;
}

const WhatsAppSetup = () => {
  const navigate = useNavigate();
  const [companyDocs, setCompanyDocs] = useState<FileItem[]>([
    { id: 1, name: "Annual_Report_2023.pdf", size: "2.4 MB", type: "pdf" },
    { id: 2, name: "Product_Catalog_Q4.pdf", size: "1.8 MB", type: "pdf" },
  ]);

  const [knowledgeBase, setKnowledgeBase] = useState<FileItem[]>([
    { id: 1, name: "Service_Terms.docx", size: "156 KB", type: "docx" },
    { id: 2, name: "FAQS_Customer_Support.csv", size: "89 KB", type: "csv" },
  ]);

  const [trainingProgress, setTrainingProgress] = useState(85);
  const [isTraining, setIsTraining] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const handleFileUpload = (
    type: "company" | "knowledge",
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    const newFiles = files.map((file, index) => ({
      id: Date.now() + index,
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.name.split(".").pop() || "",
    }));

    if (type === "company") {
      setCompanyDocs([...companyDocs, ...newFiles]);
    } else {
      setKnowledgeBase([...knowledgeBase, ...newFiles]);
    }
  };

  const removeFile = (type: "company" | "knowledge", id: number) => {
    if (type === "company") {
      setCompanyDocs(companyDocs.filter((doc) => doc.id !== id));
    } else {
      setKnowledgeBase(knowledgeBase.filter((doc) => doc.id !== id));
    }
  };

  const startTraining = () => {
    setIsTraining(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setTrainingProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsTraining(false);
        setTimeout(() => {
          alert("AI Training Complete! Your assistant is ready.");
        }, 500);
      }
    }, 300);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-5 h-5 text-destructive" />;
      case "docx":
      case "doc":
        return <FileText className="w-5 h-5 text-info" />;
      case "csv":
      case "xlsx":
        return <FileSpreadsheet className="w-5 h-5 text-success" />;
      default:
        return <File className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const features = [
    {
      icon: Shield,
      title: "Secure & Private",
      description: "End-to-end encrypted training",
    },
    {
      icon: Brain,
      title: "Smart Learning",
      description: "Improves with every interaction",
    },
    {
      icon: Globe,
      title: "Multi-Language",
      description: "Supports 50+ languages",
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "Track performance metrics",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
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
              <div className="p-2 rounded-lg bg-whatsapp/10">
                <MessageSquare className="w-6 h-6 text-whatsapp" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  WhatsApp AI Setup
                </h1>
                <p className="text-xs text-muted-foreground">
                  Train your AI assistant with company knowledge
                </p>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Training Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="card-elevated p-6">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  Train Your AI Assistant
                </h2>
              </div>

              {/* Company Documents */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <Upload className="w-4 h-4 text-info" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">
                      Upload Company Documents
                    </h3>
                    <p className="text-xs text-muted-foreground">(PDF, DOCX)</p>
                  </div>
                </div>

                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors mb-3">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Browse Files
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc"
                    onChange={(e) => handleFileUpload("company", e)}
                    className="hidden"
                  />
                </label>

                <div className="space-y-2">
                  {companyDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.type)}
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {doc.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc.size}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile("company", doc.id)}
                        className="p-1 hover:bg-destructive/10 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Knowledge Base */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <FileSpreadsheet className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">
                      FAQs & Knowledge Base
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      (CSV, TXT, XLSX)
                    </p>
                  </div>
                </div>

                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors mb-3">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Upload Files
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".csv,.txt,.xlsx"
                    onChange={(e) => handleFileUpload("knowledge", e)}
                    className="hidden"
                  />
                </label>

                <div className="space-y-2">
                  {knowledgeBase.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.type)}
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {doc.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc.size}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile("knowledge", doc.id)}
                        className="p-1 hover:bg-destructive/10 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Training Button */}
              <Button
                onClick={startTraining}
                disabled={isTraining}
                className="w-full h-12 bg-gradient-to-r from-whatsapp to-whatsapp/80 hover:opacity-90 transition-opacity"
              >
                {isTraining ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Training in Progress...
                  </>
                ) : (
                  <>
                    Start Training AI
                    <Sparkles className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              {/* Training Progress */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    AI Training Progress
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {trainingProgress}%
                  </span>
                </div>
                <Progress value={trainingProgress} className="h-2" />
                {trainingProgress === 100 && (
                  <div className="flex items-center gap-2 mt-3 text-success">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      AI Training Complete!
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Panel - WhatsApp Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">
                  WhatsApp Business Preview
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? "Hide" : "Show"}
                </Button>
              </div>

              {showPreview && (
                <div className="flex flex-col items-center">
                  {/* Phone Mockup */}
                  <div className="w-full max-w-xs bg-foreground rounded-[2.5rem] p-2 shadow-2xl">
                    <div className="bg-background rounded-[2rem] overflow-hidden">
                      {/* Notch */}
                      <div className="flex justify-center py-2">
                        <div className="w-24 h-5 bg-foreground rounded-full" />
                      </div>

                      {/* WhatsApp Header */}
                      <div className="bg-whatsapp px-4 py-3 flex items-center gap-3">
                        <button className="text-whatsapp-foreground">
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-full bg-whatsapp-foreground/20 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-whatsapp-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-whatsapp-foreground">
                              BizBot Support
                            </p>
                            <p className="text-xs text-whatsapp-foreground/80">
                              Online
                            </p>
                          </div>
                        </div>
                        <Search className="w-5 h-5 text-whatsapp-foreground" />
                      </div>

                      {/* Chat Area */}
                      <div className="h-80 bg-[#ece5dd] p-3 space-y-3">
                        <div className="text-center">
                          <span className="text-xs bg-white/80 px-3 py-1 rounded-full text-muted-foreground">
                            Today
                          </span>
                        </div>

                        {/* Customer Message */}
                        <div className="flex justify-start">
                          <div className="bg-white rounded-lg rounded-tl-none p-3 max-w-[80%] shadow-sm">
                            <p className="text-xs text-muted-foreground mb-1">
                              Customer
                            </p>
                            <p className="text-sm text-foreground">
                              Hi, I'm interested in your new fiber plans?
                            </p>
                            <p className="text-[10px] text-muted-foreground text-right mt-1">
                              10:32 AM
                            </p>
                          </div>
                        </div>

                        {/* Bot Response */}
                        <div className="flex justify-end">
                          <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none p-3 max-w-[80%] shadow-sm">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-xs font-medium text-whatsapp">
                                BizBot
                              </span>
                            </div>
                            <p className="text-sm text-foreground">
                              Hello! Our fiber plans start at $49.99/month.
                              Would you like to see full details?
                            </p>
                            <div className="flex gap-2 mt-2">
                              <button className="text-xs px-3 py-1 bg-whatsapp/10 text-whatsapp rounded-full">
                                View Details
                              </button>
                              <button className="text-xs px-3 py-1 bg-whatsapp/10 text-whatsapp rounded-full">
                                Contact Sales
                              </button>
                            </div>
                            <p className="text-[10px] text-muted-foreground text-right mt-1">
                              10:33 AM ✓✓
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Input Area */}
                      <div className="bg-[#f0f0f0] p-2 flex items-center gap-2">
                        <button className="p-2">
                          <Smile className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <div className="flex-1 bg-white rounded-full px-4 py-2">
                          <input
                            type="text"
                            placeholder="Type a message"
                            className="w-full text-sm bg-transparent outline-none"
                            disabled
                          />
                        </div>
                        <button className="p-2">
                          <Paperclip className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <button className="p-2 bg-whatsapp rounded-full">
                          <Send className="w-4 h-4 text-whatsapp-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap justify-center gap-3 mt-6">
                    <div className="flex items-center gap-2 px-3 py-2 bg-accent rounded-full">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium">AI-Powered</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-accent rounded-full">
                      <Brain className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium">Context-Aware</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-accent rounded-full">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium">Instant Replies</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Features Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8"
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              className="card-elevated p-4 flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  {feature.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
};

export default WhatsAppSetup;
