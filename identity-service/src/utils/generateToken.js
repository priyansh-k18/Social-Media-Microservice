const Jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/refreshToken"); // <-- import model

const generateTokens = async (user) => {
  // Access token
  const accessToken = Jwt.sign(
    {
      userId: user._id,
      username: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: "60m" }
  );

  // Refresh token
  const refreshTokenValue = crypto.randomBytes(40).toString("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  await RefreshToken.create({
    token: refreshTokenValue,
    user: user._id,
    expiresAt,
  });

  return { accessToken, refreshToken: refreshTokenValue };
};

module.exports = generateTokens;
