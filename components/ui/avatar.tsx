export default function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-11 w-11 text-sm" };
  return <span className={`grid shrink-0 place-items-center rounded-xl bg-red-50 font-bold text-[#d92d27] ring-1 ring-red-100 ${sizes[size]}`} aria-hidden>{initials}</span>;
}
