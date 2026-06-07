import mongoose, { Schema, Document, model, models } from "mongoose";
import "./Room";

export interface IRoomKeyVersion extends Document {
  roomId: mongoose.Types.ObjectId;
  version: number;
  rotatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const RoomKeyVersionSchema = new Schema<IRoomKeyVersion>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    version: { type: Number, required: true },
    rotatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

RoomKeyVersionSchema.index({ roomId: 1, version: 1 }, { unique: true });

const RoomKeyVersion =
  models.RoomKeyVersion || model<IRoomKeyVersion>("RoomKeyVersion", RoomKeyVersionSchema);
export default RoomKeyVersion;
