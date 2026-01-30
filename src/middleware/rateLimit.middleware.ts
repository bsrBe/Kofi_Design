import { rateLimit } from 'express-rate-limit';

/**
 * General rate limiter for all API requests
 */
export const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});

/**
 * Stricter limiter for authentication routes (login/register)
 * Protects against brute-force attacks
 */
export const authLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	limit: 10, // Limit each IP to 10 login/register attempts per hour
	standardHeaders: 'draft-7',
	legacyHeaders: false,
    message: { success: false, message: 'Too many authentication attempts, please try again after an hour' }
});

/**
 * Limiter for order/revision submissions
 * Prevents spamming order creation
 */
export const submissionLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	limit: 10, // Limit each IP to 5 submissions per hour
	standardHeaders: 'draft-7',
	legacyHeaders: false,
    message: { success: false, message: 'Order submission limit reached, please try again later' }
});
