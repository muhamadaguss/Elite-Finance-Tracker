import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const GlassCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { delay?: number }>(
  ({ className, delay = 0, children, ...props }, ref) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      ref={ref}
      className={cn("glass rounded-2xl p-6", className)}
      {...props}
    >
      {children}
    </motion.div>
  )
);
GlassCard.displayName = "GlassCard";
