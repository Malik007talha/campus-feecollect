// Same rules as the server. Returns 03001234567 or null.
export function normalizePkMobile(input) {
    let digits = String(input ?? '').replace(/[\s\-().]/g, '');
    if (digits.startsWith('+92')) digits = '0' + digits.slice(3);
    else if (digits.startsWith('0092')) digits = '0' + digits.slice(4);
    else if (/^92\d{10}$/.test(digits)) digits = '0' + digits.slice(2);
    else if (/^3\d{9}$/.test(digits)) digits = '0' + digits;
    return /^03\d{9}$/.test(digits) ? digits : null;
  }
  
  // 03001234567 -> 0300-1234567
  export function formatPkPhone(value) {
    const n = normalizePkMobile(value);
    return n ? `${n.slice(0, 4)}-${n.slice(4)}` : value || '';
  }