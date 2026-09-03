import { getSession } from "@/lib/session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LandingView from "@/app/components/landing/LandingView";

export default async function Home() {
  const session = await getSession(await headers());

  if (session) {
    redirect("/dashboard");
  }

  return <LandingView />;
}

