const generatePaymentReceipt = (transaction, tickets, event, user) => {
  const receipt = {
    receiptNumber: `RCP-${transaction.transactionId}`,
    date: new Date(),
    customerName: user.name,
    customerEmail: user.email,
    items: [{
      name: `Tiket untuk ${event.title}`,
      type: tickets[0].ticketType === 'student' ? 'Tiket Mahasiswa' : 'Tiket Regular',
      quantity: tickets.length,
      price: tickets[0].price,
      subtotal: transaction.amount
    }],
    total: transaction.amount,
    paymentMethod: transaction.paymentMethod,
    paymentStatus: transaction.paymentStatus,
    transactionId: transaction.transactionId
  };
  return receipt;
};
const getTicketDownloadLink = (ticket) => {
  return `/api/tickets/${ticket._id}/download`;
};
module.exports = {
  generatePaymentReceipt,
  getTicketDownloadLink
}; 