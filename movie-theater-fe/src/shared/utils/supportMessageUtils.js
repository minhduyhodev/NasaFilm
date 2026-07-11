export const getSupportMessageSenderLabel = (message, ticket = null) => {
  const role = `${message?.senderRole || ''}`.toUpperCase();
  const sender = `${message?.senderName || ''}`.trim();

  if (role === 'SYSTEM') {
    return sender || 'NASA BOT';
  }

  if (role === 'ADMIN') {
    if (sender && !sender.includes('@')) {
      return sender;
    }
    return ticket?.assignedStaffName || sender || 'Staff';
  }

  return sender || 'Khách hàng';
};
