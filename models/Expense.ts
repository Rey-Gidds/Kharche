import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  category: string;
  description?: string;
  date: Date;
  encryptedDescription?: string;
  encryptionVersion: number;
  createdAt: Date;
  updatedAt: Date;
  bookId?: mongoose.Types.ObjectId;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookId: { type: Schema.Types.ObjectId, ref: "ExpenseBook" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    category: { type: String, required: true },
    description: { type: String },
    date: { type: Date, default: Date.now },
    encryptedDescription: { type: String },
    encryptionVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Optimizing date sorting and filtering
ExpenseSchema.index({ userId: 1, date: -1 });
ExpenseSchema.index({ userId: 1, category: 1, date: -1 });
ExpenseSchema.index({ userId: 1, bookId: 1, date: -1 });

const Expense = models.Expense || model<IExpense>("Expense", ExpenseSchema);

export default Expense;
