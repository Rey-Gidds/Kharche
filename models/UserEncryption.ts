import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IUserEncryption extends Document {
  userId: mongoose.Types.ObjectId;
  publicKey: string;            // JWK as JSON string
  encryptedPrivateKey: string;  // AES-GCM encrypted private key JWK (encrypted with master key)
  encryptedMasterKey: string;   // AES-GCM encrypted master key (encrypted with wrapping key)
  salt: string;                 // PBKDF2 salt (base64url)
  recoveryKeyEnvelope: string;  // Master key encrypted with recovery key (JSON with iv, ciphertext, tag)
  encryptedPassphrase?: string; // EncryptedData JSON, AES-GCM with recovery key
  encryptionVersion: number;
  setupCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserEncryptionSchema = new Schema<IUserEncryption>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    publicKey: { type: String, required: true },
    encryptedPrivateKey: { type: String, required: true },
    encryptedMasterKey: { type: String, required: true },
    salt: { type: String, required: true },
    recoveryKeyEnvelope: { type: String, required: true },
    encryptedPassphrase: { type: String },
    encryptionVersion: { type: Number, default: 1 },
    setupCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UserEncryption =
  models.UserEncryption || model<IUserEncryption>("UserEncryption", UserEncryptionSchema, "userencryptions");

export default UserEncryption;
