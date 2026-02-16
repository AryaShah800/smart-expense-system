
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import d from 'dns';

d.setServers(['8.8.8.8']); // Fix DNS

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// Define Schemas locally to avoid import issues or side effects
const userSchema = new mongoose.Schema({ username: String, email: String });
const User = mongoose.model('UserDashTest', userSchema);

const categorySchema = new mongoose.Schema({
  name: String,
  type: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDashTest' },
  color: { type: String, default: '#000' }
});
const Category = mongoose.model('CategoryDashTest', categorySchema); // Use distinct collection if possible, or same but different model name?
// Mongoose might conflict if I use different model names for same collection validation.
// Let's use the ACTUAL models to be sure.

import Transaction from './models/Transaction.js';
import CategoryModel from './models/Category.js';
import UserModel from './models/User.js';

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    // 1. Create User
    const user = await UserModel.create({
      username: `dash_user_${Date.now()}`,
      email: `dash_${Date.now()}@test.com`,
      password: '123',
      isVerified: true
    });
    console.log('User created:', user._id);

    // 2. Create Custom Category
    const category = await CategoryModel.create({
      name: `Custom Cat ${Date.now()}`,
      type: 'expense',
      user: user._id,
      color: '#FF5733'
    });
    console.log('Custom Category created:', category._id, category.name);

    // 3. Create Transaction
    const transaction = await Transaction.create({
      userId: user._id,
      categoryId: category._id,
      amount: 100,
      type: 'expense',
      description: 'Test Transaction',
      date: new Date()
    });
    console.log('Transaction created:', transaction._id);

    // 4. Run Aggregation (from dashboard.js)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    console.log('Date Range:', startOfMonth, endOfMonth);

    const categoryStats = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          type: 'expense',
          // date: { $gte: startOfMonth, $lte: endOfMonth } // Comment out date first to be sure
        }
      },
      {
        $group: {
          _id: "$categoryId",
          total: { $sum: "$amount" }
        }
      },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      // Check content before unwind
      // { $project: { category: 1, total: 1 } }
      { $unwind: "$category" },
      { $project: { name: "$category.name", color: "$category.color", total: 1 } }
    ]);

    console.log('Aggregation Result:', JSON.stringify(categoryStats, null, 2));

    if (categoryStats.length > 0) {
      console.log('✅ Success: Custom category found in aggregation.');
    } else {
      console.error('❌ FAILURE: Custom category NOT found in aggregation.');
    }

    // Cleanup
    await Transaction.deleteMany({ userId: user._id });
    await CategoryModel.deleteOne({ _id: category._id });
    await UserModel.deleteOne({ _id: user._id });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
