import jwt from 'jsonwebtoken';
import 'dotenv/config';

export function isValidToken(token) {
    try {
        // console.log("JWT Secret Key:", process.env.JWT_SECRET_KEY);

        // Verify the token using the secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        // Extract userId from the decoded payload
        const userId = decoded.userId; // Assuming the token payload has a userId field
        // console.log("Decoded userId:", decoded);

        return { valid: true, userId, payload: decoded }; // Return additional payload if needed
    } catch (error) {
        console.error("Invalid token:", error.message);
        return { valid: false, error: error.message }; // Provide error details if token is invalid
    }
}

