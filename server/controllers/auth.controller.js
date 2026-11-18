import User from '../models/User.js';
import { loginSchema, changePasswordSchema } from '../validators/auth.validator.js';
import { signToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = loginSchema.parse(req.body);

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
  }).select('+password');

  // Same message for unknown user and wrong password, so attackers learn nothing.
  const ok = user && user.isActive && (await user.comparePassword(password));
  if (!ok) throw ApiError.unauthorized('Incorrect email/username or password');

  user.lastLoginAt = new Date();
  await user.save({ validateModifiedOnly: true });

  sendSuccess(res, {
    message: 'Logged in successfully',
    data: { token: signToken(user), user },
  });
});

export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: { user: req.user } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    // 400, not 401: a wrong current password must not log the person out
    throw ApiError.badRequest('Your current password is not correct', [
      { field: 'currentPassword', message: 'Incorrect password' },
    ]);
  }

  user.password = newPassword; // hashed by the pre-save hook, which also invalidates old sessions
  await user.save();

  sendSuccess(res, { message: 'Your password was changed', data: { token: signToken(user) } });
});