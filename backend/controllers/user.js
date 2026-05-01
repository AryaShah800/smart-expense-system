import User from "../models/user.js";
import Group from "../models/Group.js";
import bcrypt from "bcrypt";
import generateToken from "../utils/createToken.js";

// Helper function to send email via Brevo API
const sendEmailViaBrevo = async (toEmail, subject, htmlContent) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      // ⚠️ IMPORTANT: Change this to the Gmail you verified on Brevo
      sender: { name: "Smart Expense", email: "aryashah873@gmail.com" }, 
      to: [{ email: toEmail }],
      subject: subject,
      htmlContent: htmlContent
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Brevo API Error:", errorData);
    throw new Error("Failed to send email via Brevo");
  }
  return await response.json();
};

// RESEND OTP
export const resendOtp = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Email is already verified" });

    // Generate new OTP and reset timer
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send email using Brevo
    await sendEmailViaBrevo(
      email, 
      "Your New Verification Code", 
      `<b>Your new verification code is: ${otp}</b>`
    );

    res.status(200).json({ message: "A new OTP has been sent to your email!" });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    res.status(500).json({ message: "Failed to resend OTP" });
  }
};

/* ===================== 1. AUTHENTICATION ===================== */

export const signup = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ message: "Username or Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    // Send the Email using Brevo
    await sendEmailViaBrevo(
      email,
      "Verify your email",
      `<b>Your verification code is: ${otp}</b>`
    );

    // Save the user ONLY if the email was successful
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

    const token = generateToken(res, user._id);

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token,
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

    const token = generateToken(res, user._id);

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token, 
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

// GET CURRENT USER
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

    user.invitations = user.invitations.filter(id => id.toString() !== groupId);
    await user.save();

    const adminId = group.adminId;
    if (adminId) {
       const message = `${user.username} has ${action}ed your invitation to join "${group.name}".`;

       await User.findByIdAndUpdate(adminId, {
         $push: { notifications: { message, isRead: false } }
       });

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

/* ===================== 4. USER SETTINGS ===================== */

export const updateProfile = async (req, res) => {
  try {
    const { username, currency, theme } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (username) user.username = username;
    if (currency) user.currency = currency;
    if (theme) user.theme = theme;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      currency: updatedUser.currency,
      theme: updatedUser.theme
    });

  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

export const debugGetOtp = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ message: 'Not allowed' });
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: 'Email required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ otp: user.otp });
  } catch (error) {
    console.error('Debug OTP Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};