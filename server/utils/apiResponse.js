// One consistent JSON shape for every successful response.
export function sendSuccess(res, { data = null, message = 'Success', statusCode = 200, pagination } = {}) {
    const body = { success: true, message, data };
    if (pagination) body.pagination = pagination;
    return res.status(statusCode).json(body);
  }