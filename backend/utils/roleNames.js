// 角色中文名称映射
export const roleNames = {
  student: '学生',
  teacher: '教师',
  student_representative: '学生代表',
  teacher_representative: '教师代表',
  admin: '管理员'
};

// 获取角色中文名称
export const getRoleName = (role) => {
  return roleNames[role] || role;
};

// 获取所有角色列表
export const getAllRoles = () => {
  return Object.keys(roleNames);
};

