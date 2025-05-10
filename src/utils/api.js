/**
 * Membeli tiket event
 * @param {Object} data - Data pembelian tiket
 * @param {string} data.eventId - ID event
 * @param {string} data.ticketTypeId - ID tipe tiket (opsional)
 * @param {string} data.ticketType - Tipe tiket ('regular' atau 'student')
 * @param {number} data.quantity - Jumlah tiket
 * @param {string} data.paymentMethod - Metode pembayaran (default: 'midtrans')
 * @returns {Promise<Object>} Response dari server
 */
export const purchaseTicket = async (data) => {
  try {
    const response = await fetch(`${API_URL}/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Gagal membeli tiket');
    }

    return result;
  } catch (error) {
    console.error('Error purchasing ticket:', error);
    throw error;
  }
};

/**
 * Mendapatkan status transaksi
 * @param {string} transactionId - ID transaksi
 * @returns {Promise<Object>} Status transaksi
 */
export const getTransactionStatus = async (transactionId) => {
  try {
    const response = await fetch(`${API_URL}/payments/status/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Gagal mendapatkan status transaksi');
    }

    return result;
  } catch (error) {
    console.error('Error getting transaction status:', error);
    throw error;
  }
};

/**
 * Membuka halaman pembayaran Midtrans
 * @param {string} redirectUrl - URL pembayaran dari Midtrans
 */
export const openMidtransPayment = (redirectUrl) => {
  if (!redirectUrl) {
    throw new Error('URL pembayaran tidak tersedia');
  }
  window.location.href = redirectUrl;
}; 