import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50",
          variant === "default" &&
            "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
          variant === "outline" &&
            "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
          variant === "ghost" &&
            "text-gray-700 hover:bg-gray-100",
          variant === "destructive" &&
            "bg-red-600 text-white hover:bg-red-700",
          variant === "secondary" &&
            "bg-gray-100 text-gray-700 hover:bg-gray-200",
          size === "sm" && "h-8 px-3 text-xs gap-1.5",
          size === "md" && "h-9 px-4 text-sm gap-2",
          size === "lg" && "h-11 px-6 text-base gap-2",
          size === "icon" && "h-9 w-9",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
