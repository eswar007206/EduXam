import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface DropdownMenuItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  danger?: boolean;
}

interface DropdownMenuProps {
  /** Items to show in the list */
  items: DropdownMenuItem[];
  /** Currently selected value — shows a checkmark next to that item */
  value?: string;
  /** Called when an item is clicked */
  onChange: (value: string) => void;
  /**
   * What to render as the trigger button.
   * If a string is passed, it renders a default styled button
   * showing that string + the selected item's label + chevron.
   * If ReactNode is passed, that node becomes the trigger as-is.
   */
  trigger?: React.ReactNode | string;
  /** Placeholder shown in the default trigger when nothing is selected */
  placeholder?: string;
  /** Extra class on the outer wrapper */
  className?: string;
  /** Align the menu panel: left edge of trigger (default) or right edge */
  align?: "left" | "right";
  /** Make the trigger button stretch to full width of its container */
  fullWidth?: boolean;
}

export default function DropdownMenu({
  items,
  value,
  onChange,
  trigger,
  placeholder = "Select…",
  className,
  align = "left",
  fullWidth = false,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const selected = items.find((i) => i.value === value);

  // Default trigger button
  const defaultTrigger = (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className={cn(
        "flex items-center gap-2 px-3.5 py-2.5",
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        "text-sm font-medium text-gray-800",
        "transition-all duration-200",
        "hover:border-[#071952]/40 hover:shadow-md hover:bg-[#071952]/[0.02]",
        "focus:outline-none focus:ring-2 focus:ring-[#071952]/10 focus:border-[#071952]",
        open && "border-[#071952] ring-2 ring-[#071952]/10",
        fullWidth && "w-full"
      )}
    >
      {selected?.icon && (
        <span className="text-[#071952]/60">{selected.icon}</span>
      )}
      <span className="flex-1 text-left whitespace-nowrap">
        {selected ? selected.label : placeholder}
      </span>
      <ChevronDown
        className={cn(
          "w-4 h-4 text-[#071952]/50 transition-transform duration-200",
          open && "rotate-180 text-[#071952]"
        )}
      />
    </button>
  );

  const triggerEl =
    typeof trigger === "string" ? (
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2.5",
          "rounded-xl border border-gray-200 bg-white shadow-sm",
          "text-sm font-medium text-gray-800",
          "transition-all duration-200",
          "hover:border-[#071952]/40 hover:shadow-md",
          "focus:outline-none focus:ring-2 focus:ring-[#071952]/10 focus:border-[#071952]",
          open && "border-[#071952] ring-2 ring-[#071952]/10"
        )}
      >
        {trigger}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-[#071952]/50 transition-transform duration-200",
            open && "rotate-180 text-[#071952]"
          )}
        />
      </button>
    ) : trigger ? (
      <div onClick={() => setOpen((o) => !o)} className="cursor-pointer">
        {trigger}
      </div>
    ) : (
      defaultTrigger
    );

  return (
    <div ref={wrapperRef} className={cn(fullWidth ? "relative block w-full" : "relative inline-block", className)}>
      {triggerEl}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute z-50 mt-1.5 min-w-[10rem]",
              "bg-white rounded-2xl border border-gray-100",
              "shadow-[0_8px_32px_rgba(7,25,82,0.12),0_2px_8px_rgba(0,0,0,0.06)]",
              "py-1.5 overflow-hidden",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {items.map((item) => {
              const isSelected = item.value === value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3.5 py-2.5 mx-1 rounded-xl",
                    "text-sm text-left transition-all duration-150",
                    "w-[calc(100%-8px)]",
                    isSelected
                      ? "text-[#071952] font-semibold bg-[#071952]/5"
                      : item.danger
                      ? "text-red-600 font-medium hover:bg-red-50"
                      : "text-gray-700 font-medium hover:bg-[#071952]/5 hover:text-[#071952]"
                  )}
                >
                  {item.icon && (
                    <span className={cn("flex-shrink-0", isSelected ? "text-[#071952]" : item.danger ? "text-red-500" : "text-gray-400")}>
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1">{item.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#071952] flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
