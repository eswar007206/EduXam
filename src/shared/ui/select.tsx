import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type StyledSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  /** Extra class applied to the outer wrapper div */
  wrapperClassName?: string;
};

const StyledSelect = forwardRef<HTMLSelectElement, StyledSelectProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => {
    return (
      <div className={cn("relative", wrapperClassName)}>
        <select
          ref={ref}
          className={cn(
            "w-full appearance-none cursor-pointer outline-none",
            "pl-3.5 pr-9 py-2.5",
            "rounded-xl",
            "bg-white text-gray-800 text-sm font-medium",
            "border border-gray-200",
            "shadow-sm",
            "transition-all duration-200",
            "hover:border-[#071952]/40 hover:bg-[#071952]/[0.02] hover:shadow-md",
            "focus:border-[#071952] focus:ring-2 focus:ring-[#071952]/10 focus:bg-white",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        >
          {children}
        </select>

        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#071952]/50 select-none"
        />
      </div>
    );
  }
);

StyledSelect.displayName = "StyledSelect";

export default StyledSelect;
