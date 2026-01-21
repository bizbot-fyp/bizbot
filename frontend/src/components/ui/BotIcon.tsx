import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BotIconProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  animated?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

const eyeSizes = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-3 h-3",
};

export const BotIcon = ({
  size = "md",
  className,
  animated = true,
}: BotIconProps) => {
  return (
    <motion.div
      className={cn(
        "relative rounded-xl flex items-center justify-center",
        sizeClasses[size],
        className,
      )}
      style={{
        background: "linear-gradient(to bottom right, #232878, #232878CC)",
      }}
      animate={animated ? { y: [0, -3, 0] } : undefined}
      transition={
        animated
          ? { duration: 2, repeat: Infinity, ease: "easeInOut" as const }
          : undefined
      }
    >
      {/* Antenna */}
      <div
        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0.5 h-2 rounded-full"
        style={{ backgroundColor: "#232878" }}
      >
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
          style={{ backgroundColor: "#232878" }}
        />
      </div>

      {/* Eyes */}
      <div className="flex gap-2">
        <div
          className={cn("rounded-full", eyeSizes[size])}
          style={{ backgroundColor: "white" }}
        />
        <div
          className={cn("rounded-full", eyeSizes[size])}
          style={{ backgroundColor: "white" }}
        />
      </div>
    </motion.div>
  );
};

export default BotIcon;
