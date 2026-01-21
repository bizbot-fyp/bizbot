/**
 * File: SocialMediaStudio.tsx
 * Author: Areeba Abdullah
 *
 * Purpose: Renders the AI-powered social media content studio, allowing
 *          users to generate, preview, and schedule posts across multiple
 *          platforms with customizable tone and content calendar integration.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Palette,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Loader2,
  Calendar,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface Platform {
  instagram: boolean;
  facebook: boolean;
  twitter: boolean;
  linkedin: boolean;
}

interface Post {
  platform: string;
  text: string;
  hashtags: string[];
}

interface GeneratedContent {
  image: string;
  posts: Post[];
}

interface ScheduledPost extends Post {
  id: number;
  scheduledDate: string;
  image: string;
}

const SocialMediaStudio = () => {
  const navigate = useNavigate();
  const [contentTopic, setContentTopic] = useState("");
  const [platforms, setPlatforms] = useState<Platform>({
    instagram: false,
    facebook: false,
    twitter: false,
    linkedin: false,
  });
  const [tone, setTone] = useState("excited");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] =
    useState<GeneratedContent | null>(null);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [postToSchedule, setPostToSchedule] = useState<Post | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const handlePlatformToggle = (platform: keyof Platform) => {
    setPlatforms((prev) => ({
      ...prev,
      [platform]: !prev[platform],
    }));
  };

  const handleGenerateContent = async () => {
    if (!contentTopic.trim()) {
      alert("Please enter a content topic");
      return;
    }

    const selectedPlatforms = Object.keys(platforms).filter(
      (p) => platforms[p as keyof Platform],
    );
    if (selectedPlatforms.length === 0) {
      alert("Please select at least one platform");
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      const mockContent: GeneratedContent = {
        image:
          "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop",
        posts: selectedPlatforms.map((platform) => ({
          platform,
          text: generateMockText(platform, contentTopic, tone),
          hashtags: generateHashtags(contentTopic),
        })),
      };

      setGeneratedContent(mockContent);
      setIsGenerating(false);
    }, 2000);
  };

  const generateMockText = (
    platform: string,
    topic: string,
    toneType: string,
  ) => {
    const toneWords: Record<string, string> = {
      excited: "🎉 Get ready for warp speed! Our NEW",
      informative: "📊 Introducing our new",
      professional: "💼 We are pleased to announce",
    };

    const platformText: Record<string, string> = {
      instagram: `${toneWords[toneType]} ${topic}! Blazing fast, reliable, and affordable. Say goodbye to buffering! #LaunchDay #UnlimitedData`,
      facebook: `${toneWords[toneType]} ${topic}! Keep everyone connected on the ultimate fiber internet plan!`,
      twitter: `${toneWords[toneType]} ${topic}! Experience the business of tomorrow with our fiber optic network! #FutureIsHere #Innovation`,
      linkedin: `${toneWords[toneType]} ${topic}. Empowering businesses with cutting-edge connectivity solutions.`,
    };

    return platformText[platform] || `Check out our new ${topic}!`;
  };

  const generateHashtags = (topic: string) => {
    return [
      "#Innovation",
      "#LaunchDay",
      "#UnlimitedData",
      `#${topic.replace(/\s+/g, "")}`,
    ];
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, React.ReactNode> = {
      instagram: <Instagram className="w-5 h-5" />,
      facebook: <Facebook className="w-5 h-5" />,
      twitter: <Twitter className="w-5 h-5" />,
      linkedin: <Linkedin className="w-5 h-5" />,
    };
    return icons[platform];
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      instagram: "from-pink-500 to-orange-400",
      facebook: "from-blue-600 to-blue-400",
      twitter: "from-sky-500 to-sky-400",
      linkedin: "from-blue-700 to-blue-500",
    };
    return colors[platform] || "from-primary to-primary/80";
  };

  const handleSchedulePost = () => {
    if (!selectedDate || !postToSchedule) return;

    const newPost: ScheduledPost = {
      ...postToSchedule,
      id: Date.now(),
      scheduledDate: selectedDate.toISOString(),
      image: generatedContent?.image || "",
    };

    setScheduledPosts((prev) => [...prev, newPost]);
    setShowDatePicker(false);
    setPostToSchedule(null);
    setSelectedDate(undefined);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-social/10">
                <Palette className="w-6 h-6 text-social" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  Social Media Content Studio
                </h1>
                <p className="text-xs text-muted-foreground">
                  AI-Powered Content Generation
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Input */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Content Topic
              </h2>
              <Input
                type="text"
                placeholder="e.g., New Fiber Optic Plans - Launch"
                value={contentTopic}
                onChange={(e) => setContentTopic(e.target.value)}
                className="mb-6"
              />

              <h3 className="text-sm font-medium text-foreground mb-3">
                Platforms
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {(Object.keys(platforms) as Array<keyof Platform>).map(
                  (platform) => (
                    <button
                      key={platform}
                      onClick={() => handlePlatformToggle(platform)}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                        platforms[platform]
                          ? `bg-gradient-to-r ${getPlatformColor(platform)} text-white border-transparent`
                          : "bg-card border-border hover:bg-accent"
                      }`}
                    >
                      {getPlatformIcon(platform)}
                      <span className="text-sm font-medium capitalize">
                        {platform}
                      </span>
                    </button>
                  ),
                )}
              </div>

              <h3 className="text-sm font-medium text-foreground mb-3">
                Desired Tone
              </h3>
              <RadioGroup value={tone} onValueChange={setTone} className="mb-6">
                {["excited", "informative", "professional"].map((t) => (
                  <div key={t} className="flex items-center space-x-2">
                    <RadioGroupItem value={t} id={t} />
                    <Label htmlFor={t} className="capitalize cursor-pointer">
                      {t}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <Button
                onClick={handleGenerateContent}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-social to-social/80 hover:opacity-90 transition-opacity"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Content"
                )}
              </Button>
            </div>
          </motion.div>

          {/* Middle Panel - Generated Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Generated Content
              </h2>

              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-10 h-10 text-[#1E2361] animate-spin mb-4" />

                  <p className="text-muted-foreground">
                    AI Generating Visuals: 90%
                  </p>
                </div>
              )}

              {!isGenerating && generatedContent && (
                <>
                  <div className="rounded-lg overflow-hidden mb-4">
                    <img
                      src={generatedContent.image}
                      alt="Generated content"
                      className="w-full h-48 object-cover"
                    />
                  </div>

                  <div className="space-y-4">
                    {generatedContent.posts.map((post, index) => (
                      <div
                        key={index}
                        className="p-4 bg-[#d6d9f5]/50 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${getPlatformColor(post.platform)} text-white text-xs font-medium`}
                          >
                            {getPlatformIcon(post.platform)}
                            <span className="capitalize">{post.platform}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPostToSchedule(post);
                              setSelectedDate(undefined);
                              setShowDatePicker(true);
                            }}
                            className="text-xs"
                          >
                            Schedule →
                          </Button>
                        </div>
                        <p className="text-sm text-foreground mb-2">
                          {post.text}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {post.hashtags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs text-[#1E2361] font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {!isGenerating && !generatedContent && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Palette className="w-12 h-12 text-[#1E2361]/30 mb-4" />
                  <p className="text-muted-foreground">
                    Enter a topic and generate content to see results here
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right Panel - Calendar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Content Calendar
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Scheduled Posts
              </p>

              {scheduledPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Calendar className="w-12 h-12 text-[#1E2361]/30 mb-4" />
                  <p className="text-muted-foreground">
                    No scheduled posts yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledPosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg"
                    >
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted">
                        {post.image ? (
                          <img
                            src={post.image}
                            alt="Post preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-muted-foreground absolute inset-0 m-auto" />
                        )}
                        <div
                          className={`absolute bottom-0 right-0 p-1 bg-gradient-to-r ${getPlatformColor(post.platform)} rounded-tl-lg`}
                        >
                          {getPlatformIcon(post.platform)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize">
                          {post.platform}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.scheduledDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Date Picker Dialog */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Post</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDatePicker(false);
                setPostToSchedule(null);
                setSelectedDate(undefined);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSchedulePost}
              disabled={!selectedDate}
              className="bg-gradient-to-r from-[#1E2361] to-[#3a3f7d] text-white"
            >
              {selectedDate
                ? `Schedule for ${selectedDate.toLocaleDateString()}`
                : "Pick a Date"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocialMediaStudio;
