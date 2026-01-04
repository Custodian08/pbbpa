export const labelLeaseStatus = (s?: string) => {
  switch (s) {
    case 'DRAFT': return 'Черновик';
    case 'ACTIVE': return 'Активен';
    case 'TERMINATING': return 'На расторжении';
    case 'CLOSED': return 'Закрыт';
    default: return s || '';
  }
};

export const labelInvoiceStatus = (s?: string) => {
  switch (s) {
    case 'DRAFT': return 'Черновик';
    case 'SENT': return 'Отправлен';
    case 'PAID': return 'Оплачен';
    case 'PARTIALLY_PAID': return 'Частично оплачен';
    case 'OVERDUE': return 'Просрочен';
    case 'CANCELLED': return 'Отменен';
    default: return s || '';
  }
};

export const labelPaymentStatus = (s?: string) => {
  switch (s) {
    case 'PENDING': return 'В обработке';
    case 'APPLIED': return 'Зачтен';
    case 'UNRESOLVED': return 'Не сопоставлен';
    case 'REFUNDED': return 'Возврат';
    default: return s || '';
  }
};

export const labelPaymentSource = (s?: string) => {
  switch (s) {
    case 'MANUAL': return 'Вручную';
    case 'IMPORT': return 'Импорт';
    default: return s || '';
  }
};

export const labelPremiseStatus = (s?: string) => {
  switch (s) {
    case 'FREE': return 'Свободно';
    case 'RESERVED': return 'Забронировано';
    case 'RENTED': return 'Сдано';
    default: return s || '';
  }
};

export const labelPremiseType = (s?: string) => {
  switch (s) {
    case 'OFFICE': return 'Офис';
    case 'RETAIL': return 'Ритейл';
    case 'WAREHOUSE': return 'Склад';
    default: return s || '';
  }
};

export const labelRateType = (s?: string) => {
  switch (s) {
    case 'M2': return 'BYN/м²';
    case 'FIXED': return 'Фикс';
    default: return s || '';
  }
};

export const labelReservationStatus = (s?: string) => {
  switch (s) {
    case 'ACTIVE': return 'Активна';
    case 'EXPIRED': return 'Истекла';
    case 'CANCELLED': return 'Отменена';
    default: return s || '';
  }
};
