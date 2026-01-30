/**
 * Centralized message templates for Telegram Bot
 */

export const UserTemplates = {
    ORDER_RECEIVED: (fullName: string) => 
        `We’ve received your order form 🤍\nWe’ll review the details and get back to you shortly.`,

    ORDER_QUOTE: (totalPrice: number, deliveryDate: string, rushFee: number) => 
        `Based on your order, here are the details:\n` +
        `📌 Total price: <b>${totalPrice} ETB</b>\n` +
        `📌 Delivery date: <b>${deliveryDate}</b>\n` +
        `📌 Rush fee: <b>${rushFee > 0 ? rushFee + ' ETB' : 'None'}</b>\n\n` +
        `A 30% deposit is required to confirm your order.`,

    ORDER_CONFIRMED: (orderType: string, deliveryDate: string) => 
        `Your order has been confirmed 🤍\n` +
        `📌 Order type: <b>${orderType.replace(/_/g, ' ')}</b>\n` +
        `📌 Delivery date: <b>${deliveryDate}</b>\n` +
        `📌 Balance due on delivery\n\n` +
        `Thank you for trusting us.`,

    ORDER_READY: (balanceDue: number) => 
        `Your dress is ready 🤍\n` +
        `Please arrange pickup / delivery.\n` +
        `Remaining balance: <b>${balanceDue} ETB</b>`,

    ORDER_DELIVERED: () => 
        `✅ Your order has been <b>delivered</b>! We hope you love your new dress. Thank you for choosing us!`,

    GENERIC_STATUS_UPDATE: (status: string) => 
        `Your order status has been updated to: <b>${status.replace(/_/g, ' ')}</b>`,

    REVISION_SUBMITTED: (isFree: boolean, fee: number) => 
        `Revision request submitted. Status: <b>${isFree ? 'Approved (Free)' : 'Pending Payment'}</b>\n` +
        (isFree ? `Our team is reviewing your request.` : `📌 Revision fee: <b>${fee} ETB</b>\n\nPlease send your payment to confirm the request.`),

    REVISION_APPROVED: (orderId: string) => 
        `✅ Your revision request for order <b>#${orderId}</b> has been <b>approved</b>! Our team is working on it.`,

    REVISION_REJECTED: (orderId: string, reason: string) => 
        `❌ Your revision request for order <b>#${orderId}</b> was <b>not approved</b>. Reason: ${reason || 'Please contact support'}.`,

    PAYMENT_CONFIRMED: (orderId: string) => 
        `✅ <b>Payment Received!</b> Your revision fee for order <b>#${orderId}</b> has been confirmed. Thank you!`
};

export const AdminTemplates = {
    NEW_ORDER: (fullName: string, orderType: string, occasion: string, deliveryDate: string, rushMultiplier: number, orderId: string) => {
        const rushPercent = Math.round((rushMultiplier - 1) * 100);
        const rushMessage = rushPercent > 0 ? `\n⚠️ <b>RUSH ORDER (+${rushPercent}%)</b>` : '';
        return `<b>New Order Received! 👗</b>\n` +
            `<b>Client:</b> ${fullName}\n` +
            `<b>Type:</b> ${orderType.replace(/_/g, ' ')}\n` +
            `<b>Occasion:</b> ${occasion}\n` +
            `<b>Delivery:</b> ${deliveryDate}${rushMessage}\n` +
            `<a href="${process.env.ADMIN_URL}/orders/${orderId}">View in Dashboard</a>`;
    },

    NEW_REVISION: (orderId: string, fullName: string, reason: string, isFree: boolean, revisionFee: number, revisionId: string) => {
        const feeStr = isFree ? 'FREE' : `${revisionFee} ETB ⚠️ <b>PAYMENT REQUIRED</b>`;
        return `<b>New Revision Requested! 🛠️</b>\n` +
            `<b>Order ID:</b> ${orderId}\n` +
            `<b>Client:</b> ${fullName}\n` +
            `<b>Reason:</b> ${reason || 'Not specified'}\n` +
            `<b>Fee:</b> ${feeStr}\n` +
            `<a href="${process.env.ADMIN_URL}/revisions/${revisionId}">Review Revision</a>`;
    }
};
