import { LucideProps } from "lucide-react";

export function ListClock(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 6H3" />
      <path d="M10 12H3" />
      <path d="M10 18H3" />
      <circle cx="16" cy="15" r="5" />
      <path d="M16 13v2l1.5 1" />
    </svg>
  );
}

export default ListClock;
