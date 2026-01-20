import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Target,
  Zap,
  Shield,
  Users,
  Linkedin,
  Twitter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BotIcon from "@/components/ui/BotIcon";
import { jwtDecode } from "jwt-decode";
import areebaImg from "@/assets/team/areeba.png";
import najamImg from "@/assets/team/najam.png";
import omamaImg from "@/assets/team/omama.png";
import hibaImg from "@/assets/team/hiba.png";

const teamMembers = [
  {
    name: "Syed Najam U Saqib ",
    role: "CEO & Founder",
    description: "Visionary AI Leader",
    avatar: najamImg,
    initials: "NS",
  },
  {
    name: "HIBA NOOR",
    role: "CTO",
    description: "Tech Architecture Expert",
    avatar: hibaImg,
    initials: "HN",
  },
  {
    name: "AREEBA ABDULLAH",
    role: "Head of Product",
    description: "UX & Innovation Driven",
    avatar: areebaImg,
    initials: "AA",
  },
  {
    name: "OMAMA ARSHAD",
    role: "Lead Engineer",
    description: "Full-Stack Automation Guru",
    avatar: omamaImg,
    initials: "OA",
  },
];

const values = [
  {
    icon: Target,
    title: "Mission-Driven",
    description:
      "We're committed to democratizing business automation for companies of all sizes.",
  },
  {
    icon: Zap,
    title: "Innovation First",
    description:
      "Constantly pushing boundaries with cutting-edge AI and automation technology.",
  },
  {
    icon: Shield,
    title: "Trust & Security",
    description:
      "Enterprise-grade security ensuring your data is always protected.",
  },
  {
    icon: Users,
    title: "Customer Obsessed",
    description:
      "Your success is our success. We build what businesses truly need.",
  },
];

const AboutUs = () => {
  const navigate = useNavigate();

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
            <Link to="/contact">
              <Button variant="ghost">Contact</Button>
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
              About <span className="text-primary">BizBot</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We're on a mission to revolutionize how businesses operate by
              making enterprise-grade automation accessible to everyone. Founded
              in 2021, BizBot has helped thousands of companies streamline their
              workflows and focus on what matters most—growth.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-border/50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "10K+", label: "Active Users" },
              { value: "500M+", label: "Automations Run" },
              { value: "99.9%", label: "Uptime SLA" },
              { value: "50+", label: "Countries" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Our Values
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do at BizBot.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <value.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {value.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Meet Our Team
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The passionate people behind BizBot's innovation and success.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16 border-2 border-primary/20">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {member.name}
                        </h3>
                        <p className="text-sm text-primary font-medium">
                          {member.role}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {member.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Linkedin className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Twitter className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Transform Your Business?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of companies already using BizBot to automate their
              success.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={handleGoBack}
                className="w-full sm:w-auto"
              >
                Go Back
              </Button>
              <Link to="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Contact Sales
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>© 2024 BizBot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default AboutUs;
