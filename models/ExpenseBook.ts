import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IExpenseBook extends Document {
  userId: mongoose.Types.ObjectId;
  currency: string;
  encryptedTitle: string;
  encryptedDescription: string;
  encryptionVersion: number;
  expenses: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseBookSchema = new Schema<IExpenseBook>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    currency: { type: String, required: true },
    encryptedTitle: { type: String, required: true },
    encryptedDescription: { type: String, default: "" },
    encryptionVersion: { type: Number, default: 1 },
    expenses: [{ type: Schema.Types.ObjectId, ref: "Expense" }],
  },
  { timestamps: true }
);

const ExpenseBook = models.ExpenseBook || model<IExpenseBook>("ExpenseBook", ExpenseBookSchema);

export default ExpenseBook;
