import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { IndianRupee, Plus, Search, Eye, X, BookOpen, User, Check, Printer, FileText, Link2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PaymentsFeesPage = () => {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Ledger state
  const [ledgerStudent, setLedgerStudent] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Modals state
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    studentId: '',
    amount: '',
    mode: 'cash',
    remarks: '',
  });

  const [discountData, setDiscountData] = useState({
    scholarshipAmount: '',
    discountRemarks: '',
  });

  useEffect(() => {
    fetchPayments();
    fetchStudents();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/payments');
      setPayments(response.data);
    } catch (error) {
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/users?role=student');
      setStudents(response.data);
    } catch (e) {}
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/payments', formData);
      toast.success('Tuition fee payment recorded');
      setIsRecordOpen(false);
      
      // Load receipt modal immediately
      setSelectedPayment(response.data);
      setIsReceiptOpen(true);
      
      setFormData({
        studentId: '',
        amount: '',
        mode: 'cash',
        remarks: '',
      });
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleViewLedger = async (studentId) => {
    setLedgerLoading(true);
    setIsLedgerOpen(true);
    try {
      const response = await api.get(`/payments/ledger/${studentId}`);
      setLedgerData(response.data);
      const studentObj = students.find((s) => s._id === studentId);
      setLedgerStudent(studentObj);
    } catch (error) {
      toast.error('Failed to compile student fee ledger');
      setIsLedgerOpen(false);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleDiscountSubmit = async (e) => {
    e.preventDefault();
    try {
      // Modify user profile scholarshipAmount parameters
      await api.put(`/users/${ledgerStudent._id}`, {
        scholarshipAmount: Number(discountData.scholarshipAmount),
        discountRemarks: discountData.discountRemarks,
      });
      toast.success('Scholarship adjustment saved');
      setIsDiscountOpen(false);
      
      // Reload ledger details
      const response = await api.get(`/payments/ledger/${ledgerStudent._id}`);
      setLedgerData(response.data);
      fetchPayments();
    } catch (error) {
      toast.error('Failed to apply scholarship adjustments');
    }
  };

  const handlePrintReceipt = () => {
    const printContent = document.getElementById('receipt-print-area').innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Reload window state to rebind react tree
  };

  const filteredPayments = payments.filter(
    (p) =>
      p.student?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <IndianRupee className="w-6 h-6 text-amber-500" /> Fees & Payments
          </h2>
          <p className="text-xs text-slate-500 mt-1">Record student fee deposits, verify invoice ledgers, and issue cash receipts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/dashboard/payments/online" className="btn-outline flex items-center gap-1.5 px-4 py-2">
            <Link2 className="w-4 h-4" /> Online Payments
          </Link>
          <button
            onClick={() => {
              setFormData({ studentId: '', amount: '', mode: 'cash', remarks: '' });
              setIsRecordOpen(true);
            }}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus className="w-4.5 h-4.5" /> Record Fee Deposit
          </button>
        </div>
      </div>

      {/* Roster & Search */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side list payments */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4.5 w-4.5 text-slate-500" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by student name or receipt number..."
                className="input-field pl-10"
              />
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wide">
                    <th className="p-4">Student</th>
                    <th className="p-4">Receipt</th>
                    <th className="p-4">Payment Date</th>
                    <th className="p-4">Mode</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPayments.length > 0 ? (
                    filteredPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <p className="font-bold text-slate-900 leading-tight capitalize">{p.student?.name}</p>
                          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{p.student?.phone}</p>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-500">{p.receiptNumber}</td>
                        <td className="p-4 text-slate-500 font-medium">
                          {new Date(p.date).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] uppercase font-bold">
                            {p.mode}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-900 text-right">
                          ₹{p.amount.toLocaleString()}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedPayment(p);
                              setIsReceiptOpen(true);
                            }}
                            className="p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 rounded cursor-pointer"
                          >
                            <Eye className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-semibold">No payments recorded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right side list students ledger shortcuts */}
        <div className="glass-card p-5 h-fit space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Quick Student Fee Ledgers
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
            {students.map((s) => (
              <div
                key={s._id}
                onClick={() => handleViewLedger(s._id)}
                className="py-3 flex items-center justify-between cursor-pointer group border-b border-slate-200"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">{s.name}</p>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Roll: {s.profile?.studentId || 'N/A'}</p>
                </div>
                <span className="text-[11px] text-amber-600 font-semibold opacity-0 group-hover:opacity-100 transition-all uppercase">
                  View Ledger &rarr;
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECORD DEPOSIT MODAL */}
      {isRecordOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-fade-in flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-amber-500" /> Record Fee Deposit
              </h3>
              <button onClick={() => setIsRecordOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Select Student</label>
                <select
                  required
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Choose Enrolled Student</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} (Roll: {s.profile?.studentId || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Amount Paid (INR)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g. 50000"
                  className="input-field font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Payment Mode</label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  className="input-field"
                >
                  <option value="cash">Cash payment</option>
                  <option value="online">Online / Gateway</option>
                  <option value="bank_transfer">Bank transfer / NEFT</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Deposit for 1st Semester tuition fees..."
                  rows="3"
                  className="input-field resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRecordOpen(false)}
                  className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2">
                  Record Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT LEDGER MODAL */}
      {isLedgerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-xl animate-fade-in flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-900 text-white">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" /> Student Fee Ledger: {ledgerStudent?.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                  Roll ID: {ledgerData?.student?.studentId} | Course Program: {ledgerData?.student?.course?.name}
                </p>
              </div>
              <button onClick={() => setIsLedgerOpen(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {ledgerLoading ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Ledger metrics overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Total Tuition</p>
                    <p className="text-sm font-semibold text-slate-800">₹{ledgerData?.feeDetails?.totalFee?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Scholarship</p>
                    <p className="text-sm font-semibold text-amber-600">₹{ledgerData?.feeDetails?.scholarshipAmount?.toLocaleString()}</p>
                  </div>
                  <div className="bg-emerald-50/50 p-4 border border-emerald-100/50 rounded-xl space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-emerald-600 font-semibold">Net Fee</p>
                    <p className="text-sm font-semibold text-emerald-700">₹{ledgerData?.feeDetails?.netFee?.toLocaleString()}</p>
                  </div>
                  <div className="bg-rose-50/50 p-4 border border-rose-100/50 rounded-xl space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-rose-600 font-semibold">Remaining Balance</p>
                    <p className="text-sm font-semibold text-rose-700">₹{ledgerData?.feeDetails?.pendingBalance?.toLocaleString()}</p>
                  </div>
                </div>

                {/* Scholarship adjust panel */}
                <div className="bg-amber-500/[0.02] p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900">Configure scholarship discount</p>
                    <p className="text-[11px] text-slate-500">Apply a tuition discount/scholarship adjustment for this candidate.</p>
                  </div>
                  <button
                    onClick={() => {
                      setDiscountData({
                        scholarshipAmount: ledgerData?.feeDetails?.scholarshipAmount || 0,
                        discountRemarks: ledgerData?.feeDetails?.discountRemarks || '',
                      });
                      setIsDiscountOpen(true);
                    }}
                    className="px-3 py-1.5 bg-amber-500 text-slate-900 rounded-lg text-[11px] font-bold uppercase hover:bg-amber-600 cursor-pointer"
                  >
                    Adjust Fee structure
                  </button>
                </div>

                {/* Payments Table list */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Transaction Ledger Payments</h4>
                  <div className="glass-card overflow-hidden">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wide">
                          <th className="p-3">Receipt Number</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Payment Mode</th>
                          <th className="p-3">Cashier</th>
                          <th className="p-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {ledgerData?.payments?.length > 0 ? (
                          ledgerData.payments.map((p) => (
                            <tr key={p._id}>
                              <td className="p-3 font-mono font-bold text-slate-600">{p.receiptNumber}</td>
                              <td className="p-3 text-slate-500">{new Date(p.date).toLocaleDateString()}</td>
                              <td className="p-3 text-slate-500 capitalize">{p.mode}</td>
                              <td className="p-3 text-slate-500">{p.receivedBy?.name}</td>
                              <td className="p-3 font-semibold text-slate-900 text-right">₹{p.amount.toLocaleString()}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500 font-semibold">No payments recorded on ledger</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCHOLARSHIP ADJUSTMENT DETAILS MODAL */}
      {isDiscountOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-fade-in">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Adjust Fee Structure: {ledgerStudent?.name}</h3>
              <button onClick={() => setIsDiscountOpen(false)} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDiscountSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Scholarship / Discount Amount (INR)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max={ledgerData?.feeDetails?.totalFee}
                  value={discountData.scholarshipAmount}
                  onChange={(e) => setDiscountData({ ...discountData, scholarshipAmount: e.target.value })}
                  placeholder="Enter discount value"
                  className="input-field font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Discount Rationale / Remarks</label>
                <textarea
                  required
                  value={discountData.discountRemarks}
                  onChange={(e) => setDiscountData({ ...discountData, discountRemarks: e.target.value })}
                  placeholder="Reason for fee adjustment (e.g. Merit scholarship based on entrance exam score)..."
                  rows="3"
                  className="input-field resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDiscountOpen(false)}
                  className="btn-outline px-4 py-2 border-slate-200 text-slate-500"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2">
                  Apply Discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT MODAL */}
      {isReceiptOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-fade-in flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-100">
              <h3 className="text-xs font-semibold uppercase text-slate-600 tracking-wide">Fee Payment Receipt</h3>
              <button onClick={() => { setSelectedPayment(null); setIsReceiptOpen(false); }} className="text-slate-500 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
              {/* PRINT AREA */}
              <div id="receipt-print-area" className="bg-white p-8 border border-slate-200 rounded-2xl space-y-6 shadow-inner font-sans text-slate-800">
                {/* Invoice header logo */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-5">
                  <div className="space-y-1">
                    <h1 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">IIAE New Delhi</h1>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide leading-none">Indian Institute of Aircraft Engineering</p>
                    <p className="text-[11px] text-slate-500 font-semibold leading-none">DGCA Ministry of Civil Aviation, Govt. of India approved</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="text-[11px] uppercase tracking-wide font-semibold bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full inline-block mb-1">Receipt</span>
                    <p className="text-xs font-mono font-semibold text-slate-900">{selectedPayment.receiptNumber}</p>
                  </div>
                </div>

                {/* Candidate details */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[11px] uppercase text-slate-500 font-semibold tracking-wide mb-1">Issued to</p>
                    <p className="font-bold text-slate-900">{selectedPayment.student?.name}</p>
                    <p className="text-slate-500 font-semibold mt-0.5">Contact: {selectedPayment.student?.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase text-slate-500 font-semibold tracking-wide mb-1">Receipt Date</p>
                    <p className="font-bold text-slate-900">{new Date(selectedPayment.date).toLocaleDateString()}</p>
                    <p className="text-slate-500 font-semibold mt-0.5">Mode: {selectedPayment.mode.toUpperCase()}</p>
                  </div>
                </div>

                {/* Ledger Details */}
                <div className="glass-card overflow-hidden">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wide">
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-50">
                        <td className="p-3 font-semibold text-slate-700">
                          Tuition Course Fees Deposit
                          {selectedPayment.remarks && <span className="block text-[11px] text-slate-500 font-semibold mt-1">Note: {selectedPayment.remarks}</span>}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 text-right">₹{selectedPayment.amount?.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">Total Paid (INR)</td>
                        <td className="p-3 font-semibold text-slate-900 text-right text-sm">₹{selectedPayment.amount?.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Sign off */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-100 text-[11px] font-semibold text-slate-500 uppercase">
                  <div>
                    <p>Cashier Reference: {selectedPayment.receivedBy?.name || 'Accountant Portal'}</p>
                  </div>
                  <div className="text-right text-[11px] font-bold text-slate-300">
                    <p className="border-t border-slate-200 pt-1 px-4 mt-6">Authorized Signatory</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => { setSelectedPayment(null); setIsReceiptOpen(false); }}
                className="btn-outline px-4 py-2 border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                Close
              </button>
              <button onClick={handlePrintReceipt} className="btn-primary px-4 py-2 flex items-center gap-1.5">
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsFeesPage;
