import mongoose, { Schema, Document, model, models } from "mongoose";
import "./Room";

export type MembershipStatus = "KEY_EXCHANGE_PENDING" | "KEY_AVAILABLE" | "ACTIVE" | "LEFT";

export interface IRoomMembership extends Document {
  roomId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: MembershipStatus;
  currentKeyVersion: number;
  invitedBy?: mongoose.Types.ObjectId;
  keyDeliveredAt?: Date;
  activatedAt?: Date;
  lastVisitedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RoomMembershipSchema = new Schema<IRoomMembership>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["KEY_EXCHANGE_PENDING", "KEY_AVAILABLE", "ACTIVE", "LEFT"],
      default: "KEY_EXCHANGE_PENDING",
      required: true,
    },
    currentKeyVersion: { type: Number, default: 0, required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    keyDeliveredAt: { type: Date },
    activatedAt: { type: Date },
    lastVisitedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

RoomMembershipSchema.index({ roomId: 1, userId: 1 }, { unique: true });
RoomMembershipSchema.index({ roomId: 1, status: 1 });
RoomMembershipSchema.index({ userId: 1, status: 1 });

const RoomMembership =
  models.RoomMembership || model<IRoomMembership>("RoomMembership", RoomMembershipSchema);
export default RoomMembership;
