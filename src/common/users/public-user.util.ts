import { Users } from '../../entities/users.entity';

export function toPublicUser(user: Users) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
  };
}
