import jwt from "jsonwebtoken";

const getBearerToken = (req) => {
  const authorizationHeader = req.get("authorization") || "";

  if (!authorizationHeader.startsWith("Bearer ")) {
    return "";
  }

  return authorizationHeader.slice("Bearer ".length).trim();
};

export const requireAuth = (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({ message: "Authorization token is required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload?.id) {
      return res.status(401).json({ message: "Invalid authorization token" });
    }

    req.user = { id: payload.id };
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Session expired or invalid. Please log in again",
      error: error.message
    });
  }
};
