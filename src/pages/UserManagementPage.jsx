import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Users, UserPlus, Search, Edit3, Trash2, Shield, Plus, X, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import PasswordInput from '../components/PasswordInput';
import { toast } from 'react-hot-toast';

const PAGE_SIZES = [20, 50, 100];

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'counsellor',
    status: 'active',
    // Student specific fields
    courseId: '',
    fatherName: '',
    motherName: '',
    dob: '',
    gender: 'Male',
    address: '',
    tenthPercentage: 0,
    twelfthPercentage: 0,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'counsellor',
      status: 'active',
      courseId: '',
      fatherName: '',
      motherName: '',
      dob: '',
      gender: 'Male',
      address: '',
      tenthPercentage: 0,
      twelfthPercentage: 0,
    });
  };

  useEffect(() => {
    fetchUsers();
    fetchCourses();
  }, [roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const endpoint = roleFilter ? `/users?role=${roleFilter}` : '/users';
      const response = await api.get(endpoint);
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to retrieve user directory');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Failed to load courses list');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (payload.role !== 'student') {
        // Clear student parameters if not a student
        delete payload.courseId;
        delete payload.fatherName;
        delete payload.motherName;
        delete payload.dob;
        delete payload.gender;
        delete payload.address;
        delete payload.tenthPercentage;
        delete payload.twelfthPercentage;
      }

      await api.post('/users', payload);
      toast.success('Account generated successfully');
      setIsCreateOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user account');
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: '', // blank password unless modifying
      role: user.role,
      status: user.status,
      // student parameters
      courseId: user.profile?.course?._id || user.profile?.course || '',
      fatherName: user.profile?.fatherName || '',
      motherName: user.profile?.motherName || '',
      dob: user.profile?.dob ? new Date(user.profile.dob).toISOString().split('T')[0] : '',
      gender: user.profile?.gender || 'Male',
      address: user.profile?.address || '',
      tenthPercentage: user.profile?.academicDetails?.tenthPercentage || 0,
      twelfthPercentage: user.profile?.academicDetails?.twelfthPercentage || 0,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password; // only update password if filled
      
      if (payload.role !== 'student') {
        delete payload.courseId;
        delete payload.fatherName;
        delete payload.motherName;
        delete payload.dob;
        delete payload.gender;
        delete payload.address;
        delete payload.tenthPercentage;
        delete payload.twelfthPercentage;
      }

      await api.put(`/users/${selectedUser._id}`, payload);
      toast.success('Account updated successfully');
      setIsEditOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user profile');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to terminate this user profile?')) return;

    try {
      await api.delete(`/users/${id}`);
      toast.success('Account deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  // Filter listings by search criteria
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.phone.includes(term) ||
      (u.profile?.studentId && u.profile.studentId.toLowerCase().includes(term))
    );
  });

  const totalPages = Math.max(Math.ceil(filteredUsers.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" /> User Directory
          </h2>
          <p className="text-xs text-slate-500 mt-1">Configure staff parameters, teachers, accountants, and student profiles.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsCreateOpen(true); }}
          className="btn-primary flex items-center gap-1.5"
        >
          <UserPlus className="w-4.5 h-4.5" /> Provision New User
        </button>
      </div>

      {/* Filters search */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-500" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            placeholder="Search by name, email, phone or roll number..."
            className="input-field pl-10"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">Filter Role</label>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="input-field py-2"
          >
            <option value="">All Accounts</option>
            <option value="admin">Administrators</option>
            <option value="manager">Managers</option>
            <option value="counsellor">Counsellors</option>
            <option value="accountant">Accountants</option>
            <option value="teacher">Teachers</option>
            <option value="student">Students</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wide">
                  <th className="p-4">Name Details</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pageUsers.length > 0 ? (
                  pageUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {/* <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                            {u.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                          </div> */}
                          <div>
                            <p className="font-bold text-slate-900 leading-tight capitalize">{u.name}</p>
                            {u.role === 'student' && u.profile?.studentId && (
                              <p className="text-[11px] font-mono text-amber-600 font-bold mt-0.5">
                                Roll: {u.profile.studentId}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-slate-800">{u.email}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5 font-semibold">{u.phone}</p>
                      </td>
                      <td className="p-4">
                        <span className="capitalize font-bold text-slate-800 flex items-center gap-1.5">
                          {u.role === 'admin' && <Shield className="w-3.5 h-3.5 text-rose-500" />}
                          {u.role === 'student' && <GraduationCap className="w-3.5 h-3.5 text-blue-500" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded-md ${
                          u.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(u)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u._id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-semibold">No accounts found in directory</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500 font-semibold">
              {filteredUsers.length} account(s) | Page {currentPage} of {totalPages}
            </p>
            <select
              value={pageSize}
              onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
              className="input-field !h-8 !w-auto text-xs"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size} per page</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1 || loading} className="btn-outline !h-8 !px-2.5 text-xs cursor-pointer disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages || loading} className="btn-outline !h-8 !px-2.5 text-xs cursor-pointer disabled:opacity-40">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl animate-fade-in flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" /> Create System Account
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@iiae.in"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
                  <PasswordInput
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Set account password"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">System Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="input-field"
                  >
                    <option value="admin">Administrator</option>
                    <option value="manager">Manager</option>
                    <option value="counsellor">Counsellor</option>
                    <option value="accountant">Accountant</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* STUDENT PROFILE SPECIFIC FORM FIELDS */}
              {formData.role === 'student' && (
                <div className="border-t border-slate-100 pt-4 mt-6 space-y-4">
                  <h4 className="text-[11px] font-semibold text-amber-500 uppercase tracking-wide flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" /> Student Profile Details
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Enrolling Course</label>
                      <select
                        required
                        value={formData.courseId}
                        onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                        className="input-field"
                      >
                        <option value="">Select Enrolling Program</option>
                        {courses.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name} ({c.code}) - ₹{c.baseFees.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Father's Name</label>
                      <input
                        type="text"
                        value={formData.fatherName}
                        onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                        placeholder="Enter Father's Name"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Mother's Name</label>
                      <input
                        type="text"
                        value={formData.motherName}
                        onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                        placeholder="Enter Mother's Name"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="input-field"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Permanent Address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter Address"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">10th Score (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.tenthPercentage}
                        onChange={(e) => setFormData({ ...formData, tenthPercentage: Number(e.target.value) })}
                        placeholder="10th Percentage"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">12th Score (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.twelfthPercentage}
                        onChange={(e) => setFormData({ ...formData, twelfthPercentage: Number(e.target.value) })}
                        placeholder="12th Percentage"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2">
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl animate-fade-in flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" /> Edit System Account
              </h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@iiae.in"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password (Leave blank to keep current)</label>
                  <PasswordInput
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter new password if modifying"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">System Role</label>
                  <select
                    disabled // Role cannot be changed once created (safeguard)
                    value={formData.role}
                    className="input-field bg-slate-50 cursor-not-allowed opacity-70"
                  >
                    <option value="admin">Administrator</option>
                    <option value="manager">Manager</option>
                    <option value="counsellor">Counsellor</option>
                    <option value="accountant">Accountant</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* STUDENT PROFILE SPECIFIC EDIT FIELDS */}
              {formData.role === 'student' && (
                <div className="border-t border-slate-100 pt-4 mt-6 space-y-4">
                  <h4 className="text-[11px] font-semibold text-amber-500 uppercase tracking-wide flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" /> Student Profile Details
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Course Program</label>
                      <select
                        required
                        value={formData.courseId}
                        onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                        className="input-field"
                      >
                        <option value="">Select Enrolling Program</option>
                        {courses.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name} ({c.code}) - ₹{c.baseFees.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Father's Name</label>
                      <input
                        type="text"
                        value={formData.fatherName}
                        onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                        placeholder="Enter Father's Name"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Mother's Name</label>
                      <input
                        type="text"
                        value={formData.motherName}
                        onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                        placeholder="Enter Mother's Name"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="input-field"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Permanent Address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter Address"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">10th Score (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.tenthPercentage}
                        onChange={(e) => setFormData({ ...formData, tenthPercentage: Number(e.target.value) })}
                        placeholder="10th Percentage"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">12th Score (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.twelfthPercentage}
                        onChange={(e) => setFormData({ ...formData, twelfthPercentage: Number(e.target.value) })}
                        placeholder="12th Percentage"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2">
                  Update Account Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
