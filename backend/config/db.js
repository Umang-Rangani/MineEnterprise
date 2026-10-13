const mongoose = require('mongoose')

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in .env')
  }

  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('MongoDB Connected:', mongoose.connection.host)
  } catch (error) {
    console.error('MongoDB Connection Failed:', error.message)
    throw error
  }
}

module.exports = connectDB
