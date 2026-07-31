import mongoose, { Schema, Document, model, models } from "mongoose";
import "./User";

export interface IPushSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
  },
  { timestamps: true }
);

PushSubscriptionSchema.index({ userId: 1 });
// endpoint uniqueness already handled by the field-level unique: true above

const PushSubscription =
  models.PushSubscription ||
  model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
export default PushSubscription;
