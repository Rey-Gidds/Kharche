import RoomMembership, { IRoomMembership } from "@/models/RoomMembership";

/**
 * Require that the user has an ACTIVE membership for the given room.
 * Throws if not found — useful for route handlers to guard endpoints.
 */
export async function requireActiveMembership(
  roomId: string,
  userId: string,
): Promise<IRoomMembership> {
  const membership = await RoomMembership.findOne({ roomId, userId, status: "ACTIVE" });
  if (!membership) {
    throw new Error("Active membership required");
  }
  return membership;
}
