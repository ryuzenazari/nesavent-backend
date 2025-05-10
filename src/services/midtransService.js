const midtransClient = require('midtrans-client');
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});
const createTransaction = async (transaction, user, tickets, event) => {
  try {
    console.log('Creating Midtrans transaction with parameters:', {
      orderId: transaction.transactionId,
      amount: transaction.amount,
      user: user.email,
      event: event.title
    });

    const parameter = {
      transaction_details: {
        order_id: transaction.transactionId,
        gross_amount: transaction.amount
      },
      customer_details: {
        first_name: user.name.split(' ')[0],
        last_name: user.name.split(' ').slice(1).join(' '),
        email: user.email
      },
      item_details: [
        {
          id: event._id,
          price: tickets[0].price,
          quantity: tickets.length,
          name: `Tiket untuk ${event.title}`,
          category: tickets[0].ticketType === 'student' ? 'Tiket Mahasiswa' : 'Tiket Regular'
        }
      ],
      credit_card: {
        secure: true
      }
    };

    console.log('Midtrans request parameters:', JSON.stringify(parameter, null, 2));

    const response = await snap.createTransaction(parameter);
    
    console.log('Midtrans Response:', JSON.stringify(response, null, 2));
    
    if (!response.token || !response.redirect_url) {
      console.error('Midtrans response missing required fields:', response);
      throw new Error('Response Midtrans tidak lengkap');
    }

    // Pastikan semua field yang diperlukan ada
    const result = {
      token: response.token,
      redirect_url: response.redirect_url,
      order_id: response.order_id,
      transaction_id: response.transaction_id,
      transaction_status: response.transaction_status,
      transaction_time: response.transaction_time,
      status_code: response.status_code,
      status_message: response.status_message,
      payment_type: response.payment_type,
      gross_amount: response.gross_amount,
      currency: response.currency,
      merchant_id: response.merchant_id
    };

    console.log('Formatted Midtrans response:', result);
    return result;
  } catch (error) {
    console.error('Midtrans Error:', error);
    throw new Error(`Midtrans Error: ${error.message}`);
  }
};
const getTransactionStatus = async (transactionId) => {
  try {
    const response = await snap.transaction.status(transactionId);
    return response;
  } catch (error) {
    throw new Error(`Midtrans Error: ${error.message}`);
  }
};
const verifyNotification = async (notificationJson) => {
  try {
    const statusResponse = await snap.transaction.notification(notificationJson);
    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;
    let status;
    if (transactionStatus === 'capture') {
      if (fraudStatus === 'challenge') {
        status = 'pending';
      } else if (fraudStatus === 'accept') {
        status = 'completed';
      }
    } else if (transactionStatus === 'settlement') {
      status = 'completed';
    } else if (transactionStatus === 'deny') {
      status = 'failed';
    } else if (transactionStatus === 'cancel' || transactionStatus === 'expire') {
      status = 'failed';
    } else if (transactionStatus === 'pending') {
      status = 'pending';
    } else {
      status = 'failed';
    }
    return { orderId, status, statusResponse };
  } catch (error) {
    throw new Error(`Midtrans Notification Error: ${error.message}`);
  }
};
module.exports = {
  createTransaction,
  getTransactionStatus,
  verifyNotification
}; 