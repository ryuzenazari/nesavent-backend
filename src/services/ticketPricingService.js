/**
 * Service untuk menghitung harga tiket dengan penambahan biaya platform dan Midtrans
 * yang dibebankan ke pembeli
 */

/**
 * Konstanta untuk biaya platform dan Midtrans
 */
const PLATFORM_FEE_PERCENTAGE = 3; // 3% dari harga tiket dibebankan ke pembeli

/**
 * Perkiraan biaya Midtrans berdasarkan metode pembayaran
 */
const MIDTRANS_FEES = {
  bank_transfer: {
    type: 'fixed',
    amount: 4000, // Rp 4.000 per transaksi
  },
  credit_card: {
    type: 'percentage',
    amount: 2.5, // 2.5% dari total transaksi
    minimum: 2000, // Minimal Rp 2.000
  },
  e_wallet: {
    type: 'percentage',
    amount: 1.5, // 1.5% dari total transaksi
    minimum: 1000, // Minimal Rp 1.000
  },
  qris: {
    type: 'percentage',
    amount: 0.7, // 0.7% dari total transaksi
    minimum: 1000, // Minimal Rp 1.000
  },
  retail: {
    type: 'fixed',
    amount: 5000, // Rp 5.000 per transaksi
  },
};

/**
 * Menghitung biaya yang dibebankan ke pembeli
 * 
 * @param {number} basePrice - Harga dasar tiket yang ditentukan oleh kreator
 * @param {string} paymentMethod - Metode pembayaran yang dipilih pembeli
 * @return {object} Rincian harga termasuk biaya platform dan Midtrans
 */
const calculateBuyerPrice = (basePrice, paymentMethod = 'bank_transfer') => {
  // Biaya platform (3% dari harga tiket)
  const platformFee = Math.ceil(basePrice * PLATFORM_FEE_PERCENTAGE / 100);

  // Biaya Midtrans
  let midtransFee = 0;
  const paymentMethodFee = MIDTRANS_FEES[paymentMethod] || MIDTRANS_FEES.bank_transfer;
  
  if (paymentMethodFee.type === 'fixed') {
    midtransFee = paymentMethodFee.amount;
  } else {
    // Persentase dihitung dari harga dasar + biaya platform
    const subtotal = basePrice + platformFee;
    midtransFee = Math.ceil(subtotal * paymentMethodFee.amount / 100);
    
    // Pastikan biaya minimum terpenuhi
    if (midtransFee < paymentMethodFee.minimum) {
      midtransFee = paymentMethodFee.minimum;
    }
  }

  // Total harga yang harus dibayar pembeli
  const totalPrice = basePrice + platformFee + midtransFee;

  return {
    basePrice,         // Harga dasar yang ditentukan kreator
    platformFee,       // Biaya platform (3%)
    midtransFee,       // Biaya Midtrans
    totalPrice,        // Total yang harus dibayar pembeli
    creatorEarning: basePrice // Pendapatan kreator tetap utuh (sama dengan basePrice)
  };
};

/**
 * Mendapatkan rincian biaya Midtrans untuk ditampilkan ke pengguna
 */
const getMidtransFeeDescription = () => {
  return {
    bank_transfer: 'Rp 4.000 per transaksi',
    credit_card: '2,5% dari total transaksi',
    e_wallet: '1,5% dari total transaksi',
    qris: '0,7% dari total transaksi',
    retail: 'Rp 5.000 per transaksi'
  };
};

module.exports = {
  calculateBuyerPrice,
  getMidtransFeeDescription,
  PLATFORM_FEE_PERCENTAGE,
  MIDTRANS_FEES,
}; 