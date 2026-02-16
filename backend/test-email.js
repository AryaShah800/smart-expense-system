import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendTest() {
  try {
    console.log("⏳ Attempting to send email...");
    console.log(`   From: ${process.env.EMAIL_USER}`);
    
    const info = await transporter.sendMail({
      from: '"Test" <no-reply@test.com>',
      to: process.env.EMAIL_USER, // Sends to yourself
      subject: "It Works!",
      text: "If you are reading this, your email setup is perfect! 🚀"
    });

    console.log("✅ SUCCESS! Email sent.");
    console.log("   Message ID:", info.messageId);
  } catch (error) {
    console.log("\n❌ FAILED. Here is the error:");
    console.error(error.message);
    
    if (error.message.includes("Username and Password not accepted")) {
      console.log("👉 FIX: Your EMAIL_PASS in .env is wrong. Did you use the 16-char App Password?");
    }
  }
}

sendTest();