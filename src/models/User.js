import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    doctorId: {
      type: String,
      maxlength: 10,
    },
    pharmacyId: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);


export const User = mongoose.models.User || mongoose.model('User', userSchema);
