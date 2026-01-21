import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import './AdminUsers.css';

const roleLabels = {
  student: '学生',
  teacher: '教师',
  student_representative: '学生代表',
  teacher_representative: '教师代表',
  admin: '系统管理员'
};

const AdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', department: '', studentId: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userAPI.getAllUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error('获取用户失败:', err);
      setError(err.response?.data?.message || '获取用户失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const allowedRolesForFilter = (() => {
      if (user?.role === 'student_representative') return ['student'];
      if (user?.role === 'teacher_representative') return ['teacher'];
      if (user?.role === 'admin') return ['all', 'student_representative', 'teacher_representative'];
      return ['all'];
    })();

    // 如果当前筛选不在允许范围内，自动重置为第一个可选项
    if (!allowedRolesForFilter.includes(roleFilter)) {
      setRoleFilter(allowedRolesForFilter[0]);
    }

    return users.filter((u) => {
      const roleOk = roleFilter === 'all' ? allowedRolesForFilter.includes(u.role) : u.role === roleFilter;
      const kw = keyword.trim().toLowerCase();
      const kwOk =
        !kw ||
        (u.name && u.name.toLowerCase().includes(kw)) ||
        (u.email && u.email.toLowerCase().includes(kw)) ||
        (u.studentId && u.studentId.toLowerCase().includes(kw));
      return roleOk && kwOk;
    });
  }, [users, roleFilter, keyword]);

  const myScopeTip = useMemo(() => {
    if (user?.role === 'admin') return '你可以管理所有用户，包括代表、教师和学生。';
    if (user?.role === 'student_representative') return '你可以管理学生用户。';
    if (user?.role === 'teacher_representative') return '你可以管理教师用户。';
    return '';
  }, [user]);

  const canManageTarget = (target) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'student_representative' && target.role === 'student') return true;
    if (user.role === 'teacher_representative' && target.role === 'teacher') return true;
    return false;
  };

  const handleStartEdit = (u) => {
    setEditingId(u._id);
    setEditForm({
      name: u.name || '',
      department: u.department || '',
      studentId: u.studentId || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', department: '', studentId: '' });
  };

  const handleSave = async (u) => {
    try {
      setSaving(true);
      await userAPI.updateUser(u._id, {
        name: editForm.name,
        department: editForm.department,
        studentId: editForm.studentId,
      });
      await fetchUsers();
      handleCancelEdit();
    } catch (err) {
      setError(err.response?.data?.message || '更新用户失败');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u) => {
    try {
      setSaving(true);
      await userAPI.updateUser(u._id, { isActive: !(u.isActive ?? true) });
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || '更新状态失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="admin-users-page">
        <div className="admin-users-header">
          <div>
            <h1>用户管理</h1>
            <p className="page-subtitle">{myScopeTip}</p>
          </div>
          <button className="btn-secondary" onClick={fetchUsers}>
            刷新
          </button>
        </div>

        <div className="admin-users-filters">
          <div className="filter-group">
            <label>角色筛选</label>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              {(() => {
                if (user?.role === 'student_representative') {
                  return [<option key="student" value="student">学生</option>];
                }
                if (user?.role === 'teacher_representative') {
                  return [<option key="teacher" value="teacher">教师</option>];
                }
                if (user?.role === 'admin') {
                  return [
                    <option key="all" value="all">全部</option>,
                    <option key="student_representative" value="student_representative">学生代表</option>,
                    <option key="teacher_representative" value="teacher_representative">教师代表</option>
                  ];
                }
                return [<option key="all" value="all">全部</option>];
              })()}
            </select>
          </div>
          <div className="filter-group">
            <label>搜索</label>
            <input
              type="text"
              placeholder="姓名/邮箱/学号"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p>暂无用户</p>
            <p className="empty-hint">尝试调整筛选条件</p>
          </div>
        ) : (
          <div className="user-table">
            <div className="user-table-header">
              <span>姓名</span>
              <span>邮箱</span>
              <span>角色</span>
              <span>院系/部门</span>
              <span>学号/工号</span>
              <span>状态</span>
              <span>操作</span>
            </div>
            {filteredUsers.map((u) => (
              <div key={u._id} className="user-table-row">
                <span>
                  {editingId === u._id ? (
                    <input
                      className="inline-input"
                      value={editForm.name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  ) : (
                    u.name || '-'
                  )}
                </span>
                <span>{u.email || '-'}</span>
                <span>{roleLabels[u.role] || u.role}</span>
                <span>
                  {editingId === u._id ? (
                    <input
                      className="inline-input"
                      value={editForm.department}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))}
                    />
                  ) : (
                    u.department || '-'
                  )}
                </span>
                <span>
                  {editingId === u._id ? (
                    <input
                      className="inline-input"
                      value={editForm.studentId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, studentId: e.target.value }))}
                    />
                  ) : (
                    u.studentId || '-'
                  )}
                </span>
                <span className={u.isActive === false ? 'status-badge inactive' : 'status-badge active'}>
                  {u.isActive === false ? '停用' : '正常'}
                </span>
                <span className="user-actions">
                  {editingId === u._id ? (
                    <>
                      <button
                        className="btn-small primary"
                        onClick={() => handleSave(u)}
                        disabled={saving}
                      >
                        {saving ? '保存中' : '保存'}
                      </button>
                      <button className="btn-small ghost" onClick={handleCancelEdit} disabled={saving}>
                        取消
                      </button>
                    </>
                  ) : (
                    canManageTarget(u) && (
                      <>
                        <button className="btn-small ghost" onClick={() => handleStartEdit(u)}>
                          编辑
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            className="btn-small danger"
                            onClick={() => handleToggleActive(u)}
                            disabled={saving}
                          >
                            {u.isActive === false ? '启用' : '停用'}
                          </button>
                        )}
                      </>
                    )
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminUsers;

