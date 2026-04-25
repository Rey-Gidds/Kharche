import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import JoinRoomClient from "./JoinRoomClient";

export default async function JoinRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect(`/sign-in?callbackUrl=/rooms/join/${roomId}`);
  }

  return <JoinRoomClient roomId={roomId} userId={session.user.id} userName={session.user.name} />;
}
