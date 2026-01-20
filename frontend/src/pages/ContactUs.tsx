import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  Mail, 
  Phone, 
  MapPin, 
  MessageCircle, 
  Send, 
  Clock, 
  Loader2,
  Building2,
  Headphones,
  ArrowLeft,
  Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import BotIcon from "@/components/ui/BotIcon";
import { jwtDecode } from "jwt-decode";
import api from "@/lib/api"; 

const ContactUs = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile_number: "",   
    whatsapp_number: "", 
    company: "",
    subject: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Call Backend API
      await api.post("/api/contact/", formData);

      toast({
        title: "Message Sent!",
        description: "We'll get back to you within 24 hours.",
      });
      
      // Reset form
      setFormData({ 
        name: "", 
        email: "", 
        mobile_number: "", 
        whatsapp_number: "", 
        company: "", 
        subject: "", 
        message: "" 
      });

    } catch (error) {
      console.error("Contact submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppChat = () => {
    const phoneNumber = "1234567890";
    const message = encodeURIComponent("Hi! I'm interested in learning more about BizBot's automation solutions.");
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  const handleGoBack = () => {
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        if (decoded.roles && decoded.roles.includes("Administrator")) {
          navigate("/admin");
          return;
        }
      } catch (e) {
        console.error("Error decoding token", e);
      }
    }
    navigate("/dashboard");
  };

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Us",
      description: "support@bizbot.com",
      subtext: "We reply within 24 hours",
    },
    {
      icon: Phone,
      title: "Call Us",
      description: "042-35971027",
      subtext: "Mon-Fri 9AM-6PM PST",
    },
    {
      icon: MapPin,
      title: "Visit Us",
      description: "123 DHA PHASE 6, LAHORE",
      subtext: "BLOCK 6, CA 94105",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <BotIcon size="md" />
            <span className="text-xl font-bold text-foreground">BizBot</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/about">
              <Button variant="ghost">About</Button>
            </Link>
            <Button onClick={handleGoBack} variant="default" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Get in <span className="text-primary">Touch</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Have questions about BizBot? We're here to help. Reach out to our team 
              and we'll get back to you as soon as possible.
            </p>
          </motion.div>
        </div>
      </section>

      {/* WhatsApp CTA Banner */}
      <section className="py-6 bg-[#25D366]/10 border-y border-[#25D366]/20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row items-center justify-center gap-4 text-center"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Chat with us on WhatsApp!</p>
                <p className="text-sm text-muted-foreground">Get instant support for your queries</p>
              </div>
            </div>
            <Button 
              onClick={handleWhatsAppChat}
              className="bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2"
              size="lg"
            >
              <MessageCircle className="w-5 h-5" />
              Start WhatsApp Chat
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {contactMethods.map((method, index) => (
              <motion.div
                key={method.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full border-border/50 hover:border-primary/30 transition-colors text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <method.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{method.title}</h3>
                    <p className="text-primary font-medium">{method.description}</p>
                    <p className="text-sm text-muted-foreground mt-1">{method.subtext}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Contact Form and Info Grid */}
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-3"
            >
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-primary" />
                    Send us a Message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name & Email */}
                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Areeba"
                          value={formData.name}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="areeba@bizbot.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    {/* NEW: Mobile & WhatsApp */}
                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="mobile_number">Mobile Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="mobile_number"
                            name="mobile_number"
                            placeholder="0303-4235678"
                            value={formData.mobile_number}
                            onChange={handleChange}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
                        <div className="relative">
                          <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="whatsapp_number"
                            name="whatsapp_number"
                            placeholder="0323-9876543"
                            value={formData.whatsapp_number}
                            onChange={handleChange}
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Company & Subject */}
                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="company">Company Name</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="company"
                            name="company"
                            placeholder="Bizbot Inc."
                            value={formData.company}
                            onChange={handleChange}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Select onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a topic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sales">Sales Inquiry</SelectItem>
                            <SelectItem value="support">Technical Support</SelectItem>
                            <SelectItem value="partnership">Partnership</SelectItem>
                            <SelectItem value="demo">Request a Demo</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Tell us how we can help you..."
                        rows={5}
                        value={formData.message}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Additional Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-2 space-y-6"
            >
              {/* Quick Connect WhatsApp */}
              <Card className="border-[#25D366]/30 bg-[#25D366]/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">WhatsApp Support</h3>
                      <p className="text-sm text-muted-foreground">Fastest response time</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect with our team instantly on WhatsApp for quick queries about 
                    pricing, features, or technical support.
                  </p>
                  <Button 
                    onClick={handleWhatsAppChat}
                    className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat on WhatsApp
                  </Button>
                </CardContent>
              </Card>

              {/* Office Hours */}
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Office Hours</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monday - Friday</span>
                      <span className="text-foreground font-medium">9:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saturday</span>
                      <span className="text-foreground font-medium">10:00 AM - 4:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sunday</span>
                      <span className="text-foreground font-medium">Closed</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    All times are in Pakistani Standard Time (PST)
                  </p>
                </CardContent>
              </Card>

              {/* Enterprise */}
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Building2 className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Enterprise Sales</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Looking for a custom solution for your organization? Our enterprise 
                    team is ready to help.
                  </p>
                  <Button variant="outline" className="w-full gap-2">
                    <Headphones className="w-4 h-4" />
                    Schedule a Call
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-12">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>© 2024 BizBot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default ContactUs;