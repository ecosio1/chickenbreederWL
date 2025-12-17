import * as React from "react";
import { cn } from "./cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
}

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:pointer-events-none disabled:opacity-50",
        // bigger touch targets for tablets/gloves
        size === "sm" ? "h-11 px-4" : size === "lg" ? "h-12 px-6 text-base" : "h-11 px-5",
        variant === "default" && "bg-black text-white hover:bg-black/90",
        variant === "secondary" && "bg-black/5 text-black hover:bg-black/10",
        variant === "ghost" && "bg-transparent hover:bg-black/5",
        variant === "destructive" && "bg-red-600 text-white hover:bg-red-600/90",
        className,
      )}
      {...props}
    />
  );
}


