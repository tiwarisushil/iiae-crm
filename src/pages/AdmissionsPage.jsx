import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { GraduationCap, CheckCircle, Search, UserPlus, FileText, ArrowRight, User, Phone, Mail, BookOpen } from 'lucide-react';
import PasswordInput from '../components/PasswordInput';
import { toast } from 'react-hot-toast';

const AdmissionsPage = () => {
  const [activeSubmenu, setActiveSubmenu] = useState('list'); // 'list' or 'add'
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Admissions Form States
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    courseId: '',
    fatherName: '',
    motherName: '',
    dob: '',
    gender: 'Male',
    address: '',
    tenthPercentage: '',
    twelfthPercentage: '',
    entranceStatus: 'passed', // Direct admission defaults to passed
  });

  useEffect(() => {
    fetchCourses();
    if (activeSubmenu === 'list') {
      fetchAdmissions();
    }
  }, [activeSubmenu]);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Failed to load courses');
    }
  };

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users?role=student');
      // Filter students who are passed or fully enrolled
      const admittedList = response.data.filter(s => 
        s.profile && ['appeared', 'passed'].includes(s.profile.entranceStatus)
      );
      setStudents(admittedList);
    } catch (error) {
      toast.error('Failed to load admissions list');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddAdmission = async (e) => {
    e.preventDefault();
    if (!formData.courseId) {
      toast.error('Please select an engineering course');
      return;
    }

    try {
      await api.post('/users', {
        ...formData,
        role: 'student',
        registrationFeePaid: true // Direct admissions are marked as registration paid
      });
      toast.success('Student admitted successfully!');
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        courseId: '',
        fatherName: '',
        motherName: '',
        dob: '',
        gender: 'Male',
        address: '',
        tenthPercentage: '',
        twelfthPercentage: '',
        entranceStatus: 'passed',
      });
      setActiveSubmenu('list');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete admission');
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.profile?.studentId && s.profile.studentId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" /> College Admissions Portal
          </h2>
          <p className="text-xs text-slate-500 mt-1">Review finalized admission checklists and provision direct seat allocations.</p>
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-xl shrink-0 self-start">
          <button
            onClick={() => setActiveSubmenu('list')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
              activeSubmenu === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Admission List
          </button>
          <button
            onClick={() => setActiveSubmenu('add')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
              activeSubmenu === 'add' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Add Admissions
          </button>
        </div>
      </div>

      {activeSubmenu === 'list' ? (
        /* Admissions List View */
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md flex items-center border-b border-slate-300 pr-3">
            <input
              type="text"
              placeholder="Search by student name, roll number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs focus:outline-none bg-transparent"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5" />
          </div>

          <div className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-12 flex justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wide">
                      <th className="p-4">Student Roll Number</th>
                      <th className="p-4">Full Name</th>
                      <th className="p-4">Contact Detail</th>
                      <th className="p-4">Engineering Course</th>
                      <th className="p-4">Batch Cohort</th>
                      <th className="p-4 text-right">Tuition Net Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => {
                        const profile = student.profile || {};
                        return (
                          <tr key={student._id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-mono font-bold text-blue-600">{profile.studentId}</td>
                            <td className="p-4 font-bold text-slate-900 capitalize">{student.name}</td>
                            <td className="p-4 space-y-0.5 font-medium text-slate-500">
                              <p className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-500" /> {student.email}</p>
                              <p className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-500" /> {student.phone}</p>
                            </td>
                            <td className="p-4">
                              <p className="font-semibold text-slate-900 leading-tight">{profile.course?.name}</p>
                              <p className="text-[11px] text-slate-500 font-semibold">{profile.course?.code}</p>
                            </td>
                            <td className="p-4">
                              {profile.batch ? (
                                <div>
                                  <p className="font-bold text-slate-800">{profile.batch.name}</p>
                                  <p className="text-[11px] text-slate-500 font-semibold uppercase">{profile.batch.schedule}</p>
                                </div>
                              ) : (
                                <span className="text-[11px] text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase">
                                  Pending Batch
                                </span>
                              )}
                            </td>
                            <td className="p-4 font-semibold text-slate-900 text-right">
                              ₹{profile.feeDetails?.netFee?.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-semibold">
                          No admitted student records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Add Admissions Form View */
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm max-w-4xl">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm leading-snug">Direct Admission Roll Entry</h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Directly provision student profile bypassing entrance workflows.</p>
            </div>
          </div>

          <form onSubmit={handleAddAdmission} className="space-y-6">
            {/* Row 1: Login Account */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">Student Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="student@iiae.in"
                  required
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">Password *</label>
                <PasswordInput
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                  className="input-field text-xs"
                />
              </div>
            </div>

            {/* Row 2: Contact & Course */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">Contact Phone *</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="9876543210"
                  required
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">Target Course *</label>
                <select
                  name="courseId"
                  value={formData.courseId}
                  onChange={handleInputChange}
                  required
                  className="input-field text-xs h-[42px]"
                >
                  <option value="">Select Engineering Branch</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.name} ({course.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="input-field text-xs h-[42px]"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Row 3: Parents details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">Father Name</label>
                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleInputChange}
                  placeholder="Father Name"
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">Mother Name</label>
                <input
                  type="text"
                  name="motherName"
                  value={formData.motherName}
                  onChange={handleInputChange}
                  placeholder="Mother Name"
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="input-field text-xs h-[42px]"
                />
              </div>
            </div>

            {/* Row 4: Academics & Address */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">10th Class Percentage</label>
                <input
                  type="number"
                  step="0.01"
                  name="tenthPercentage"
                  value={formData.tenthPercentage}
                  onChange={handleInputChange}
                  placeholder="85.50"
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">12th Class Percentage</label>
                <input
                  type="number"
                  step="0.01"
                  name="twelfthPercentage"
                  value={formData.twelfthPercentage}
                  onChange={handleInputChange}
                  placeholder="80.20"
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">Mailing Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Sector-8 Dwarka, Delhi"
                  className="input-field text-xs"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveSubmenu('list')}
                className="btn-outline px-6 text-xs border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-6 text-xs flex items-center gap-1.5"
              >
                Admit Student <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdmissionsPage;
