import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentIntentId = searchParams.get('payment_intent');
  const status = searchParams.get('status');

  const isSuccess = status === 'succeeded';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        {isSuccess ? (
          <>
            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Payment Successful!</h2>
            <p className="text-slate-500 mb-6">Thank you for your purchase.</p>
            <div className="bg-slate-50 rounded-xl p-4 mb-8 border border-slate-100 text-left">
              <p className="text-sm text-slate-500 mb-1">Transaction ID</p>
              <p className="font-mono text-slate-800 text-sm">{paymentIntentId}</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Payment Failed</h2>
            <p className="text-slate-500 mb-8">Something went wrong with your transaction.</p>
          </>
        )}
        
        <button
          onClick={() => navigate('/')}
          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-8 rounded-xl transition-all"
        >
          Return Home
        </button>
      </div>
    </div>
  );
}
