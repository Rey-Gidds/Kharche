import { getSession } from "@/lib/session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import JoinRoomClient from "./JoinRoomClient";

export default async function JoinRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  const session = await getSession(await headers());


  if (!session) {
    redirect(`/sign-in?callbackUrl=/rooms/join/${roomId}`);
  }

  return <JoinRoomClient roomId={roomId} userId={session.user.id} userName={session.user.name} />;
}
