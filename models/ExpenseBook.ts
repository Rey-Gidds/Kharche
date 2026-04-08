import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IExpenseBook extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  expenses: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseBookSchema = new Schema<IExpenseBook>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String },
    expenses: [{ type: Schema.Types.ObjectId, ref: "Expense" }],
  },
  { timestamps: true }
);

const ExpenseBook = models.ExpenseBook || model<IExpenseBook>("ExpenseBook", ExpenseBookSchema);

export default ExpenseBook;
