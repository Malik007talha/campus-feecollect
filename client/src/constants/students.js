export const STATUS_LABELS = {
    active: 'Active',
    inactive: 'Inactive',
    left: 'Left school',
  };
  
  export const DISCOUNT_LABELS = {
    none: 'No discount',
    sibling: 'Sibling discount',
    scholarship: 'Scholarship',
  };
  
  export const discountText = (student) =>
    student.discountPercent > 0
      ? `${student.discountPercent}% ${DISCOUNT_LABELS[student.discountType].toLowerCase()}`
      : '—';
  
  export const classText = (cls) => (cls ? `${cls.name} – Section ${cls.section}` : '—');