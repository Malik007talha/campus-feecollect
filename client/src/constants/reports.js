// `filters` says which filter boxes each report shows.
export const REPORTS = [
    {
      id: 'collection',
      title: 'Monthly fee collection',
      hint: 'Money received each day, split by cash, bank transfer and cheque.',
      filters: ['dateRange', 'class'],
    },
    {
      id: 'pending',
      title: 'Pending fee report',
      hint: 'Every voucher that still has a balance to pay.',
      filters: ['month', 'class'],
    },
    {
      id: 'classwise',
      title: 'Class-wise collection',
      hint: 'Billed, collected and pending for each class and section.',
      filters: ['monthRequired', 'class'],
    },
    {
      id: 'history',
      title: 'Student payment history',
      hint: 'Every payment made for a student.',
      filters: ['search', 'dateRange'],
      needsSearch: true,
    },
    {
      id: 'defaulters',
      title: 'Defaulter report',
      hint: 'Overdue vouchers with parent phone numbers.',
      filters: ['month', 'class'],
    },
    {
      id: 'discounts',
      title: 'Discount report',
      hint: 'Sibling and scholarship discounts given.',
      filters: ['month', 'class'],
    },
  ];