import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LogoImage from '../assets/Logo.png';
import RegistrationFeePayment from '../components/RegistrationFeePayment';

// Public page reached from a shared registration payment link (/pay/registration/:token).
// Shows only the fee and the Pay button; no personal details beyond the student's name.
const RegistrationPaymentPage = () => {
  const { token } = useParams();
  const [studentName, setStudentName] = useState('');

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <img src={LogoImage} alt="IIAE" className="h-12 w-12 object-contain" />
          <div>
            <p className="text-sm font-bold">IIAE New Delhi</p>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Registration fee payment</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-10">
        <section className="space-y-4 rounded-2xl border border-slate-200 p-6">
          <h1 className="text-xl font-bold">Pay your registration fee</h1>
          {studentName && <p className="text-sm text-slate-600">Application of <span className="font-semibold text-slate-900">{studentName}</span></p>}
          <RegistrationFeePayment token={token} onLoaded={(data) => setStudentName(data?.studentName || '')} />
          <p className="text-xs text-slate-500">
            Already have your login? <Link to="/login" className="font-semibold text-blue-600 underline">Sign in</Link> to see all your payments.
          </p>
        </section>
      </main>
    </div>
  );
};

export default RegistrationPaymentPage;
