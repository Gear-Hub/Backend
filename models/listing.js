import mongoose from 'mongoose'

const listingSchema = new mongoose.Schema({ // What each user will look like
  name: { type: String, required: true },
  description: { type: String, required: true },
  brand: { type: String, required: true },
  condition: { type: String, required: true },
  size: { type: String, required: true },
  price: { type: String, required: true },
  category: { type: String, required: true },
  photos: { type: [{ image: String, description: String }], default: [] },
  liked: { type: Number, required: true, default: 0 },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true })

export default mongoose.model('Listing', listingSchema)
