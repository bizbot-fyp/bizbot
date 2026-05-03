/**
 * File: EntryScreen.tsx
 * Author: Areeba Abdullah
 *
 * Purpose: Renders the entry/landing screen for BizBot, displaying
 *          animated hero text, key features, and authentication
 *          options including Google, GitHub, and LinkedIn logins.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import BotIcon from "@/components/ui/BotIcon";

const EntryScreen = () => {
  const [displayText, setDisplayText] = useState("");
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const navigate = useNavigate();

  const phrases = [
    "Automate Your Business...",
    "AI-Powered Solutions",
    "Work Smarter, Not Harder",
    "Transform Your Workflow",
  ];

  useEffect(() => {
    let charIndex = 0;
    const currentPhrase = phrases[currentPhraseIndex];

    const typingInterval = setInterval(() => {
      if (charIndex <= currentPhrase.length) {
        setDisplayText(currentPhrase.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        setTimeout(() => {
          setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
        }, 2000);
      }
    }, 100);

    return () => clearInterval(typingInterval);
  }, [currentPhraseIndex]);


  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl"
        >
          <div className="flex items-center gap-4 mb-8">
            <BotIcon size="lg" />
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground">
              BizBot
            </h1>
          </div>

          <div className="h-16 mb-6">
            <p
              className="text-2xl lg:text-3xl font-semibold"
              style={{ color: "#232878" }}
            >
              {displayText}
              <span
                className="animate-typing-cursor"
                style={{ color: "#232878" }}
              >
                |
              </span>
            </p>
          </div>

          <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
            AI-powered business automation that transforms the way you work.
            Streamline operations, enhance customer engagement, and scale
            effortlessly.
          </p>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-accent rounded-full">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-accent-foreground">
                AI-Powered
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-accent rounded-full">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-accent-foreground">
                Instant Setup
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-accent rounded-full">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-accent-foreground">
                Enterprise Secure
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Auth Card */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="card-elevated p-8 lg:p-10">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Welcome to BizBot
            </h2>
            <p className="text-muted-foreground mb-8">
              Get started with your business automation journey
            </p>

            <div className="space-y-4">
              <Button
                onClick={() => navigate("/login")}
                className="w-full h-12 text-base font-semibold text-white bg-[linear-gradient(to_right,#232878,#4348c0)] hover:opacity-90 transition-opacity"
              >
                Log In
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <Button
                onClick={() => navigate("/signup")}
                variant="outline"
                className="w-full h-12 text-base font-semibold border-2"
              >
                Create Account
              </Button>
            </div>


          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EntryScreen;
