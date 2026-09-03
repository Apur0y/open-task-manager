import Link from "next/link";
import { Check } from "lucide-react";

export default function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur-md dark:border-neutral-800/70 dark:bg-neutral-950/80 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-bold text-neutral-900 dark:text-neutral-100"
        >
          <span className="flex h-8 w-8 p-1 items-center justify-center rounded-xl bg-white text-white">
            {/* <Check className="h-4.5 w-4.5" strokeWidth={3} aria-hidden="true" /> */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className=""
              x="0px"
              y="0px"
              width="100"
              height="100"
              viewBox="0 0 48 48"
            >
              <path
                fill="#8bc34a"
                d="M11.375,40H2.75c-0.31,0-0.587-0.19-0.699-0.479c-0.112-0.289-0.035-0.616,0.193-0.825l15.514-14.164 C17.913,24.39,18,24.192,18,23.98c0-0.213-0.086-0.409-0.243-0.553L2.245,9.305C2.016,9.096,1.938,8.769,2.051,8.479 C2.162,8.19,2.44,8,2.75,8h8.625c0.186,0,0.365,0.069,0.503,0.193l16.875,15.25C28.91,23.586,29,23.788,29,24 s-0.09,0.414-0.247,0.557l-16.875,15.25C11.74,39.931,11.561,40,11.375,40z"
              ></path>
              <path
                fill="#0d47a1"
                d="M45.949 8.479C45.838 8.19 45.56 8 45.25 8h-8.625c-.186 0-.365.069-.503.194l-9.439 8.53c-.338.306-.338.837 0 1.143l4.334 3.917c.294.266.742.265 1.035-.002L45.755 9.305C45.984 9.096 46.062 8.769 45.949 8.479zM45.756 38.696L32.072 26.202c-.293-.267-.741-.269-1.035-.003l-4.354 3.934c-.338.306-.338.837 0 1.143l9.433 8.525C36.258 39.929 36.442 40 36.632 40h8.618c.31 0 .587-.19.699-.479C46.062 39.232 45.984 38.905 45.756 38.696z"
              ></path>
            </svg>
          </span>
          <span className="text-emerald-500">

          Study Tracker
          </span>
        </Link>
      </div>
    </header>
  );
}
