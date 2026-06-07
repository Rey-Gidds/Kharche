import mongoose, { Schema, Document, model, models } from "mongoose";
import "./User";
import "./RoomBook";
export interface IRoom extends Document {
  users: mongoose.Types.ObjectId[];
  bookId: mongoose.Types.ObjectId;
  currency: string;
  activeKeyVersion: number;
  name: string;
  encryptedName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    users: [{ type: Schema.Types.ObjectId, ref: "User" }],
    bookId: { type: Schema.Types.ObjectId, ref: "RoomBook" },
    currency: { type: String, required: true, default: "INR" },
    activeKeyVersion: { type: Number, default: 0 },
    name: { type: String, required: true },
    encryptedName: { type: String },
  },
  { timestamps: true }
);

const Room = models.Room || model<IRoom>("Room", RoomSchema);
export default Room;
