import { User } from '../../core/database/models/User';
import { Workspace } from '../../core/database/models/Workspace';
import { Role } from '../../core/database/models/Role';
import { hashPassword, comparePassword } from '../../core/utils/password';
import { generateTokens, verifyRefreshToken } from '../../core/utils/jwt';

export const registerUser = async (data: any) => {
  const { email, password, firstName, lastName, companyName } = data;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('Email is already registered.');
  }

  // 1. Create Workspace
  const workspace = new Workspace({ name: companyName || `${firstName}'s Workspace` });

  // 2. Setup Default Roles for this Workspace (System roles can also be used)
  const ownerRole = new Role({
    workspaceId: workspace._id,
    name: 'Team Owner',
    isSystemRole: true,
    permissions: [] // Ideally linked to permission objects
  });
  await ownerRole.save();

  // 3. Hash password and Create User
  const passwordHash = await hashPassword(password);
  const user = new User({
    email,
    passwordHash,
    firstName,
    lastName,
    workspaceId: workspace._id,
    roleId: ownerRole._id
  });

  // Assign ownerId to workspace
  workspace.ownerId = user._id as any;
  
  // Save both
  await Promise.all([workspace.save(), user.save()]);

  // Generate Tokens
  const { accessToken, refreshToken } = generateTokens({
    userId: user._id as unknown as string,
    workspaceId: workspace._id as unknown as string,
    roleId: ownerRole._id as unknown as string,
  });

  user.refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken };
};

export const loginUser = async (data: any) => {
  const { email, password } = data;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw new Error('Incorrect email or password');
  }

  if (!user.isActive) {
    throw new Error('This account has been deactivated');
  }

  const { accessToken, refreshToken } = generateTokens({
    userId: user._id as unknown as string,
    workspaceId: user.workspaceId as unknown as string,
    roleId: user.roleId as unknown as string,
  });

  user.refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken };
};

export const refreshAuthToken = async (token: string) => {
  try {
    const decoded = verifyRefreshToken(token);
    
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== token) {
      throw new Error('Invalid refresh token');
    }

    const tokens = generateTokens({
      userId: user._id as unknown as string,
      workspaceId: user.workspaceId as unknown as string,
      roleId: user.roleId as unknown as string,
    });

    user.refreshToken = tokens.refreshToken;
    await user.save();

    return tokens;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};
