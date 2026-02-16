import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "../models/user.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import Group from "../models/Group.js";
import GroupExpense from "../models/GroupExpense.js";
import Settlement from "../models/Settlement.js";

dotenv.config();

// CONFIG
const MAIN_USER_EMAIL = "aryas@example.com"; // login with this
const PASSWORD = "password123";

const seedHeavy = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🚀 Connected to DB. Starting Heavy Seeding...");

    // 1. WIPE OLD DATA
    await Promise.all([
      User.deleteMany(),
      Category.deleteMany(),
      Transaction.deleteMany(),
      Budget.deleteMany(),
      Group.deleteMany(),
      GroupExpense.deleteMany(),
      Settlement.deleteMany(),
    ]);
    console.log("🧹 Database cleared.");

    // 2. CREATE USERS
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    
    // Create Main User + 3 Friends
    const usersData = [
      { username: "Arya (You)", email: MAIN_USER_EMAIL, password: hashedPassword, isVerified: true },
      { username: "Rahul", email: "rahul@test.com", password: hashedPassword, isVerified: true },
      { username: "Sneha", email: "sneha@test.com", password: hashedPassword, isVerified: true },
      { username: "Priya", email: "priya@test.com", password: hashedPassword, isVerified: true },
    ];
    
    const users = await User.insertMany(usersData);
    const [me, rahul, sneha, priya] = users;
    console.log("👥 Users created.");

    // 3. CREATE CATEGORIES
    const catData = [
      { name: "Salary", type: "income", icon: "💰", color: "#16a34a" },
      { name: "Freelance", type: "income", icon: "💻", color: "#0ea5e9" },
      { name: "Food", type: "expense", icon: "🍔", color: "#ef4444" },
      { name: "Rent", type: "expense", icon: "🏠", color: "#6366f1" },
      { name: "Transport", type: "expense", icon: "🚕", color: "#f59e0b" },
      { name: "Entertainment", type: "expense", icon: "🎬", color: "#8b5cf6" },
      { name: "Shopping", type: "expense", icon: "🛍️", color: "#ec4899" },
      { name: "Groceries", type: "expense", icon: "🥦", color: "#10b981" },
    ];
    const categories = await Category.insertMany(catData);
    
    // Map categories for easy access
    const catMap = {};
    categories.forEach(c => catMap[c.name] = c._id);
    console.log("📂 Categories created.");

    // 4. GENERATE PERSONAL TRANSACTIONS (Last 90 Days)
    const transactions = [];
    const today = new Date();
    
    // Fixed: Salary & Rent
    for (let i = 0; i < 3; i++) {
        const d = new Date(today);
        d.setMonth(d.getMonth() - i);
        d.setDate(1); // 1st of month
        
        // Income
        transactions.push({ userId: me._id, categoryId: catMap["Salary"], type: "income", amount: 55000, date: d, description: "Salary" });
        
        // Rent (Expense)
        const rentDate = new Date(d);
        rentDate.setDate(5);
        transactions.push({ userId: me._id, categoryId: catMap["Rent"], type: "expense", amount: 12000, date: rentDate, description: "Apartment Rent" });
    }

    // Random: Daily Spending
    for (let i = 0; i < 60; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - Math.floor(Math.random() * 90)); // Random date in last 90 days

        const isFood = Math.random() > 0.5;
        if (isFood) {
            transactions.push({
                userId: me._id,
                categoryId: catMap["Food"],
                type: "expense",
                amount: Math.floor(Math.random() * 500) + 50, // 50-550 RS
                date: d,
                description: Math.random() > 0.5 ? "Lunch" : "Dinner with friends"
            });
        } else {
            transactions.push({
                userId: me._id,
                categoryId: catMap["Transport"],
                type: "expense",
                amount: Math.floor(Math.random() * 200) + 20,
                date: d,
                description: "Uber/Rapido"
            });
        }
    }

    // Occasional Big Spends
    transactions.push({ userId: me._id, categoryId: catMap["Shopping"], type: "expense", amount: 4500, date: new Date(), description: "New Headphones" });
    transactions.push({ userId: me._id, categoryId: catMap["Freelance"], type: "income", amount: 15000, date: new Date(), description: "Side Project Payment" });
    
    await Transaction.insertMany(transactions);
    console.log(`💸 ${transactions.length} Transactions added.`);

    // 5. SET BUDGETS
    await Budget.create([
        { userId: me._id, categoryId: catMap["Food"], amount: 10000 }, // Likely exceeded
        { userId: me._id, categoryId: catMap["Shopping"], amount: 5000 }, // Near limit
        { userId: me._id, categoryId: catMap["Transport"], amount: 3000 }, // Safe
    ]);
    console.log("📉 Budgets set.");

    // 6. CREATE GROUPS
    const apartmentGroup = await Group.create({
        name: "Apartment 404",
        type: "Home",
        adminId: me._id,
        members: [me._id, rahul._id, sneha._id]
    });

    const tripGroup = await Group.create({
        name: "Goa Trip 🌴",
        type: "Trip",
        adminId: rahul._id, // Rahul is admin
        members: [me._id, rahul._id, priya._id]
    });

    console.log("👨‍👩‍👧‍👦 Groups created.");

    // 7. GROUP EXPENSES & SPLITS
    
    // Scene A: Apartment (Equal Splits)
    // 1. Rahul paid for WiFi (900 total, 300 each)
    await GroupExpense.create({
        groupId: apartmentGroup._id,
        description: "WiFi Bill",
        amount: 900,
        paidBy: rahul._id,
        splitType: "equal",
        splits: [
            { userId: me._id, shareAmount: 300 },
            { userId: rahul._id, shareAmount: 300 },
            { userId: sneha._id, shareAmount: 300 },
        ]
    });

    // 2. You paid for House Cleaning (1500 total, 500 each)
    await GroupExpense.create({
        groupId: apartmentGroup._id,
        description: "Maid Salary",
        amount: 1500,
        paidBy: me._id,
        splitType: "equal",
        splits: [
            { userId: me._id, shareAmount: 500 },
            { userId: rahul._id, shareAmount: 500 },
            { userId: sneha._id, shareAmount: 500 },
        ]
    });

    // Scene B: Goa Trip (Complex)
    // 1. Priya paid for Hotel (12000) - Split Equal
    await GroupExpense.create({
        groupId: tripGroup._id,
        description: "Hotel Booking",
        amount: 12000,
        paidBy: priya._id,
        splitType: "equal",
        splits: [
            { userId: me._id, shareAmount: 4000 },
            { userId: rahul._id, shareAmount: 4000 },
            { userId: priya._id, shareAmount: 4000 },
        ]
    });

    // 2. You paid for Dinner (3000) - Rahul ate more (Unequal/Percentage logic simulated via exact)
    await GroupExpense.create({
        groupId: tripGroup._id,
        description: "Seafood Dinner",
        amount: 3000,
        paidBy: me._id,
        splitType: "exact",
        splits: [
            { userId: me._id, shareAmount: 800 },
            { userId: rahul._id, shareAmount: 1500 }, // Rahul ordered lobster
            { userId: priya._id, shareAmount: 700 },
        ]
    });

    console.log("🧾 Group expenses split.");

    // 8. SETTLEMENTS
    // Rahul pays you back 500 for the maid, but still owes for dinner
    await Settlement.create({
        groupId: apartmentGroup._id,
        fromUser: rahul._id,
        toUser: me._id,
        amount: 500
    });
    console.log("🤝 Settlements recorded.");

    // 9. NOTIFICATIONS
    // Add fake notifications to Main User
    await User.findByIdAndUpdate(me._id, {
        $push: {
            notifications: {
                message: "Rahul added 'WiFi Bill' to Apartment 404",
                isRead: false,
                createdAt: new Date()
            }
        }
    });
    await User.findByIdAndUpdate(me._id, {
        $push: {
            notifications: {
                message: "Priya added 'Hotel Booking' to Goa Trip",
                isRead: true, // Old one
                createdAt: new Date(Date.now() - 86400000)
            }
        }
    });

    console.log("🔔 Notifications added.");
    console.log(`✅ DONE! Login as: ${MAIN_USER_EMAIL} / ${PASSWORD}`);
    process.exit(0);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedHeavy();