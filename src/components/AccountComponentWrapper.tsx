import { ReactNode } from "react";
import { Button } from "./ui/button";
import Image from "next/image";
import { signIn } from "next-auth/react";

const Wrapper = ({
  auth,
  header,
  body,
}: {
  auth?: "Sign in" | "Sign up";
  header?: ReactNode;
  body: ReactNode;
}) => {
  return (
    <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border/50 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-zinc-900">
      {/* Brand accent strip */}
      <div className="h-1 w-full bg-gradient-to-r from-brand/40 via-brand to-brand/40" />

      <div className="flex flex-col gap-6 px-7 py-8">
        {/* Logo — always visible so mobile users see branding */}
        <div className="flex sm:hidden items-center justify-center gap-0.5">
          <Image
            src="/velo11.png"
            className="-mr-3 size-10 drop-shadow-sm"
            height={100}
            width={70}
            alt="Velo logo"
          />
          <span className="text-[2rem] font-bold leading-none tracking-tight">elo</span>
        </div>

        {/* Slot: page-level heading / subtitle / nav link */}
        {header && <div className="flex flex-col gap-1.5">{header}</div>}

        <div className="flex flex-col gap-4">
          {/* OAuth */}
          {auth ? (
            <>
              <Button
                variant="outline"
                onClick={() => signIn("google")}
                className="h-11 w-full gap-3 border-border/70 text-sm font-medium
                           transition-all duration-200
                           hover:border-brand/50 hover:bg-brand/5 hover:text-foreground
                           dark:hover:bg-brand/10"
              >
                <GoogleIcon />
                Continue with Google
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <hr className="flex-1 border-border/50" />
                <span className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground">
                  or {auth.toLowerCase()} with email
                </span>
                <hr className="flex-1 border-border/50" />
              </div>
            </>
          ) : null}

          {/* Slot: form */}
          {body}
        </div>
      </div>
    </div>
  );
};

const GoogleIcon = () => (
  <svg
    className="size-5 shrink-0"
    viewBox="-0.5 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <g fill="none" fillRule="evenodd">
      <path
        d="M9.827 24c0-1.524.253-2.986.705-4.356L2.623 13.604A23.3 23.3 0 0 0 .214 24c0 3.736.867 7.261 2.406 10.388l7.905-6.051A13.17 13.17 0 0 1 9.827 24"
        fill="#FBBC05"
      />
      <path
        d="M23.714 10.133c3.311 0 6.302 1.174 8.652 3.094L39.202 6.4C35.036 2.773 29.695.533 23.714.533c-9.287 0-17.268 5.311-21.09 13.071l7.909 6.04c1.822-5.532 7.017-9.511 13.181-9.511"
        fill="#EB4335"
      />
      <path
        d="M23.714 37.867c-6.165 0-11.36-3.979-13.182-9.511l-7.908 6.038c3.821 7.761 11.802 13.072 21.09 13.072 5.732 0 11.204-2.035 15.311-5.848l-7.507-5.804c-2.118 1.334-4.785 2.053-7.804 2.053"
        fill="#34A853"
      />
      <path
        d="M46.145 24c0-1.387-.186-2.877-.506-4.267H23.714v9.067h12.604c-.63 3.091-2.346 5.468-4.8 7.014l7.507 5.805C43.339 37.614 46.145 31.65 46.145 24"
        fill="#4285F4"
      />
    </g>
  </svg>
);

export default Wrapper;
