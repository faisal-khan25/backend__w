function toUserResponse(user) {
  return {
    id: user.id,
    name: user.getFullName(),
    email: user.email,
    role: user.role,
    department: user.department,
    profileImage: user.profileImage,
  };
}

module.exports = toUserResponse;
