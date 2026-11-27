import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export const generateOtp = () => randomInt(100000, 1000000).toString();

export const hashOtp = (otp) => createHash("sha256").update(otp).digest("hex");

export const otpMatches = (stored, candidate) => {
  if (typeof candidate !== "string" || candidate.length !== 6 || !/^\d{6}$/.test(candidate)) return false;
  if (typeof stored !== "string") return false;

  // Pending signups from before hashing was introduced can still verify.
  const legacy = stored.length === 6 && /^\d{6}$/.test(stored);
  if (!legacy && (stored.length !== 64 || !/^[a-f0-9]{64}$/.test(stored))) return false;

  const expected = Buffer.from(stored);
  const actual = Buffer.from(legacy ? candidate : hashOtp(candidate));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
