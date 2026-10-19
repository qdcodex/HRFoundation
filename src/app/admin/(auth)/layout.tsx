import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-forest-deep p-12 text-ivory lg:flex">
        <Link href="/" className="inline-flex w-fit items-center gap-3 rounded-lg bg-ivory px-4 py-3">
          <Image src="/brand/hr-foundation-logo.png" alt="H R Foundation" width={800} height={542} className="h-14 w-auto" priority />
        </Link>
        <div>
          <p className="font-display text-3xl leading-tight font-extrabold">Administration</p>
          <p className="mt-3 max-w-sm text-ivory/70">
            Restricted to authorised H R Foundation staff. All sign-ins and sensitive actions are recorded in the audit log.
          </p>
        </div>
        <p className="text-sm text-ivory/50">People · Opportunity · Healthier Tomorrows</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
