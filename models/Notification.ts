import mongoose, { Schema, Document, model, models } from "mongoose";
import "./User";
import "./Room";
import "./RoomTicket";

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  ticketId: mongoose.Types.ObjectId;
  ticketTitle: string;
  roomName: string;
  currency: string;
  amount: number;
  recipientShare: number;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    ticketId: { type: Schema.Types.ObjectId, ref: "RoomTicket", required: true },
    ticketTitle: { type: String, required: true },
    roomName: { type: String, required: true },
    currency: { type: String, required: true },
    amount: { type: Number, required: true },
    recipientShare: { type: Number, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Deduplication: one notification per ticket per recipient
NotificationSchema.index({ ticketId: 1, recipientId: 1 }, { unique: true });

const Notification =
  models.Notification ||
  model<INotification>("Notification", NotificationSchema);
export default Notification;
