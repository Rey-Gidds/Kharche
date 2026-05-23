import mongoose, { Schema, Document, model, models } from "mongoose";

export interface ICustomCategory extends Document {
  userId: mongoose.Types.ObjectId;
  displayName: string;
  normalizedName: string;
  usageCount: number;
  lastUsedAt: Date;
  createdAt: Date;
}

const CustomCategorySchema = new Schema<ICustomCategory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    displayName: { type: String, required: true },
    normalizedName: { type: String, required: true },
    usageCount: { type: Number, default: 1 },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { 
    timestamps: { createdAt: true, updatedAt: false } 
  }
);

// Indexes
// 1. unique compound index for userId + normalizedName to prevent duplicates
CustomCategorySchema.index({ userId: 1, normalizedName: 1 }, { unique: true });

// 2. index for sorting by usageCount descending
CustomCategorySchema.index({ userId: 1, usageCount: -1 });

// 3. index for sorting by lastUsedAt descending
CustomCategorySchema.index({ userId: 1, lastUsedAt: -1 });

const CustomCategory = models.CustomCategory || model<ICustomCategory>("CustomCategory", CustomCategorySchema);

export default CustomCategory;
