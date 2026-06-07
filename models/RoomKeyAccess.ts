import mongoose, { Schema, Document, model, models } from "mongoose";
import "./Room";
import "./User";

export interface IRoomKeyAccess extends Document {
  roomId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  keyVersion: number;
  encryptedRoomKey: string; // AsymmetricEncryptedData JSON (RSA-OAEP encrypted room key)
  createdAt: Date;
  updatedAt: Date;
}

const RoomKeyAccessSchema = new Schema<IRoomKeyAccess>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    keyVersion: { type: Number, required: true },
    encryptedRoomKey: { type: String, required: true },
  },
  { timestamps: true }
);

RoomKeyAccessSchema.index({ roomId: 1, userId: 1, keyVersion: 1 }, { unique: true });
RoomKeyAccessSchema.index({ roomId: 1, keyVersion: 1 });

const RoomKeyAccess =
  models.RoomKeyAccess || model<IRoomKeyAccess>("RoomKeyAccess", RoomKeyAccessSchema);
export default RoomKeyAccess;
