import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  walletBalance: number;
  currency: string;
  rooms: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Boolean, default: false },
    image: { type: String },
    walletBalance: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    rooms: [{ type: Schema.Types.ObjectId, ref: "Room", default: [] }],
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>("User", UserSchema, "user");
export default User;
