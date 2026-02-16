import User from "../models/user.js";
import Group from "../models/Group.js";
import bcrypt from "bcrypt";
import generateToken from "../utils/createToken.js"; // Standardized name used in your project
import nodemailer from "nodemailer"; 

// Create transporter using a function to ensure env variables are loaded
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS  
    }
  });
};

/* ===================== 1. AUTHENTICATION ===================== */

/* backend/controllers/user.js */

// Move the transporter creation INSIDE the signup function
export const signup = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // 1. Check for duplicate user
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ message: "Username or Email already exists" });

    // 2. Hash Password and Generate OTP
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    // 3. Initialize Transporter ONLY when needed
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // 4. Send the Email
    await transporter.sendMail({
      from: `"Smart Expense" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your email",
      html: `<b>Your verification code is: ${otp}</b>`
    });

    // 5. Save the user ONLY if the email was successful
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      isVerified: false,
      otp,
      otpExpires
    });
    await newUser.save();

    res.status(201).json({ message: "OTP sent to email.", email });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



// VERIFY OTP
export const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Email already verified" });

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;       
    user.otpExpires = undefined;
    await user.save();

    generateToken(res, user._id); // Authenticate user immediately after verification

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      message: "Email verified successfully!"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    if (user.isVerified === false) {
      return res.status(400).json({ message: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    generateToken(res, user._id);

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGOUT
export const logout = (req, res) => {
  res.cookie("jwt", "", { httpOnly: true, expires: new Date(0) });
  res.status(200).json({ message: "Logged out successfully" });
};

// GET CURRENT USER - Accessed by the /me route
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ===================== 2. INVITATIONS ===================== */

export const getInvitations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("invitations", "name type");
    res.json(user.invitations || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const respondToInvitation = async (req, res) => {
  try {
    const { groupId, action } = req.body; 
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user.invitations.includes(groupId)) {
        return res.status(400).json({ message: "Invitation not found" });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (action === "accept") {
      if (!group.members.includes(userId)) {
        group.members.push(userId);
        await group.save();
      }
    }

    // Remove invitation
    user.invitations = user.invitations.filter(id => id.toString() !== groupId);
    await user.save();

    // Notify Admin of the response
    const adminId = group.adminId;
    if (adminId) {
       const message = `${user.username} has ${action}ed your invitation to join "${group.name}".`;

       // 1. Save to database
       await User.findByIdAndUpdate(adminId, {
         $push: { notifications: { message, isRead: false } }
       });

       // 2. 🔥 FIRE REAL-TIME SOCKET EVENT
       const io = req.app.get("io");
       if (io) {
         io.to(adminId.toString()).emit("new_notification", {
           message,
           isRead: false,
           createdAt: new Date()
         });
       }
    }

    res.json({ message: `Invitation ${action}ed` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ===================== 3. NOTIFICATIONS ===================== */

export const getNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const sorted = user.notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markNotificationsRead = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.notifications.forEach(n => n.isRead = true);
    await user.save();
    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};