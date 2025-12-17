import * as React from "react";
import { cn } from "./cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        // bigger touch targets for tablets/gloves
        "flex h-11 w-full rounded-md border border-black/10 bg-white px-4 py-2 text-base",
        "placeholder:text-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});


