import mongoose from 'mongoose'
// http://blog.slatepeak.com/creating-a-real-time-chat-api-with-node-express-socket-io-and-mongodb/
const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }
})

export default mongoose.model('Conversation', conversationSchema)