import User from '../models/User.js';
import { loginSchema } from '../validators/auth.validator.js';
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