// Accepts 0300-1234567, 0300 1234567, +92 300 1234567, 923001234567, 3001234567.
// Returns 03001234567, or null if it is not a valid Pakistani mobile number.
export function normalizePkMobile(input) {
    let digits = String(input ?? '').replace(/[\s\-().]/g, '');
    if (digits.startsWith('+92')) digits = '0' + digits.slice(3);
    else if (digits.startsWith('0092')) digits = '0' + digits.slice(4);
    else if (/^92\d{10}$/.test(digits)) digits = '0' + digits.slice(2);
    else if (/^3\d{9}$/.test(digits)) digits = '0' + digits;
    return /^03\d{9}$/.test(digits) ? digits : null;
  }