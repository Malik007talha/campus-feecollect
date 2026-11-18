# Campus FeeCollect API

Base URL: `http://localhost:5000/api` (local) or `https://YOUR-API.onrender.com/api` (live).

## Conventions
- Send `Authorization: Bearer <token>` on every request except `/health` and `/auth/login`.
- Success: `{ "success": true, "message": "...", "data": ..., "pagination": { page, limit, total, totalPages } }`
- Error: `{ "success": false, "message": "...", "details": [ { "field": "...", "message": "..." } ] }`
- Status codes: 200/201 success, 400 invalid data, 401 not logged in or session ended, 403 wrong role, 404 not found, 409 conflict (duplicate, or a rule such as "voucher has payments"), 429 too many requests.
- Lists accept `page` and `limit` (max 100). Money is whole rupees. Dates are `YYYY-MM-DD`, months are `YYYY-MM` (Asia/Karachi).
- Roles: **A** = Admin, **AC** = Admin or Accountant.

## Auth
| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | /auth/login | Anyone | `{identifier, password}` returns `{token, user}`. 20 failed tries per 15 minutes |
| GET | /auth/me | AC | Current user |
| POST | /auth/change-password | AC | `{currentPassword, newPassword}`; ends all old sessions |

## Users
| GET | /users | A | List admins and accountants |
|---|---|---|---|
| POST | /users | A | `{name, username, email, password, role}` |
| PATCH | /users/:id | A | Edit, disable, change role, reset password |

## Classes
| GET | /classes | AC | List with student counts; `search`, `name`, `page`, `limit` |
|---|---|---|---|
| GET | /classes/names | AC | Distinct class names |
| GET | /classes/options | AC | All class-sections for dropdowns |
| GET | /classes/:id | AC | One class |
| POST | /classes | A | `{name, sections: ["A","B"]}`; existing sections are skipped |
| PATCH | /classes/:id | A | Rename class or section |
| DELETE | /classes/:id | A | Only when it has no students |

## Students
| GET | /students | AC | `search`, `className`, `section`, `status`, `page`, `limit` |
|---|---|---|---|
| GET | /students/:id | AC | One student |
| POST | /students | A | Roll number is unique per class-section |
| PATCH | /students/:id | A | Includes status and discount |
| DELETE | /students/:id | A | Refused when vouchers exist |
| GET | /students/import/template | A | Excel template (.xlsx) |
| POST | /students/import/parse | A | Raw .xlsx body; returns a row-by-row preview |
| POST | /students/import/validate | A | Re-check edited rows |
| POST | /students/import/commit | A | Saves valid rows only; reports skipped rows |

## Fees
| GET | /fees/heads | A | Fee types |
|---|---|---|---|
| POST | /fees/heads | A | `{name}` |
| DELETE | /fees/heads/:name | A | Refused while a class uses it |
| GET | /fees/structure | A | Classes with their monthly fees |
| PUT | /fees/structure | A | `{classIds:[...], fees:[{head, amount}]}` |
| GET | /fees/discounts | A | Students with discounts and what they pay |

## Vouchers
| POST | /vouchers/preview | AC | `{scope:"school"|"class", className?, section?, month, dueDate}`; saves nothing |
|---|---|---|---|
| POST | /vouchers/generate | AC | Same body; duplicate-safe (unique student + month index) |
| GET | /vouchers | AC | `month`, `status`, `className`, `section`, `search` |
| GET | /vouchers/:id | AC | One voucher with today's late fine |
| GET | /vouchers/:id/pdf | AC | Three-copy A4 PDF |
| GET | /vouchers/pdf | AC | One PDF for the filtered vouchers (`month` required, max 600) |
| DELETE | /vouchers/:id | A | `{reason}`; only an unpaid voucher with nothing paid; audit-logged |

## Payments (append-only: no edit or delete)
| GET | /payments/search | AC | Unpaid or partly paid vouchers; `q` |
|---|---|---|---|
| POST | /payments | AC | `{voucherId, amount, method, date, note?}`; cannot exceed the balance; runs in a transaction |
| GET | /payments | AC | `from`, `to`, `method`, `search` |
| GET | /payments/voucher/:voucherId | AC | History of one voucher |
| GET | /payments/:id | AC | One payment |
| GET | /payments/:id/receipt | AC | A5 receipt PDF |

## Unpaid fees, reminders, reports, dashboard
| GET | /defaulters | AC | Overdue vouchers; `search, className, section, month, minBalance, sort` |
|---|---|---|---|
| GET | /reminders/status | AC | Whether email and SMS are live or in test mode |
| POST | /reminders/send | AC | `{voucherIds | filters, channel: "email"|"sms"|"both", force?}` |
| GET | /reminders | AC | Reminder history |
| GET | /reports/:type | AC | `collection, pending, classwise, history, defaulters, discounts`; `month, from, to, className, section, search` |
| GET | /dashboard | AC | `month` |

## Settings
| GET | /settings | A | School name, address, bank details |
|---|---|---|---|
| PUT | /settings | A | Save them |
| GET | /settings/fines | A | Late fine policy |
| PUT | /settings/fines | A | `{fineType: none|fixed|per_day|percent, fineAmount, finePercent, fineGraceDays, fineCap}` |

## Health
| GET | /health | Anyone | Server and database status |
|---|---|---|---|