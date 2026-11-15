import User from '../models/User.js';
import { createUserSchema, updateUserSchema } from '../validators/auth.validator.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: { $in: ['admin', 'accountant'] } }).sort({ createdAt: -1 });
  sendSuccess(res, { data: users });
});

export const createUser = asyncHandler(async (req, res) => {
  const body = createUserSchema.parse(req.body);
  const user = await User.create(body);
  sendSuccess(res, { data: user, message: 'User created', statusCode: 201 });
});

export const updateUser = asyncHandler(async (req, res) => {
  const body = updateUserSchema.parse(req.body);

  if (req.params.id === String(req.user._id) && (body.isActive === false || (body.role && body.role !== req.user.role))) {
    throw ApiError.badRequest('You cannot deactivate yourself or change your own role');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  Object.assign(user, body); // password change is hashed by the pre-save hook
  await user.save();
  sendSuccess(res, { data: user, message: 'User updated' });
});