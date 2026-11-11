import { describe, it, expect } from 'vitest';
import { submitPayuForm, readReturnResult, stripReturnResult, formatPaise } from './payuCheckout';

describe('payuCheckout', () => {
  it('formats paise as Indian rupees', () => {
    expect(formatPaise(50000)).toBe('₹500.00');
    expect(formatPaise(20000000)).toBe('₹2,00,000.00');
  });

  it('posts exactly the backend fields to PayU and never anything else', () => {
    let submitted = false;
    const form = submitPayuForm({
      action: 'https://test.payu.in/_payment',
      params: { key: 'k', txnid: 'IIAE-1', amount: '500.00', hash: 'abc', udf4: '', skip: null },
    });
    form.submit = () => {
      submitted = true;
    };
    expect(form.method.toUpperCase()).toBe('POST');
    expect(form.action).toBe('https://test.payu.in/_payment');
    const fields = Object.fromEntries([...form.querySelectorAll('input')].map((input) => [input.name, input.value]));
    expect(fields).toEqual({ key: 'k', txnid: 'IIAE-1', amount: '500.00', hash: 'abc', udf4: '' });
    expect(JSON.stringify(fields)).not.toMatch(/salt/i);
    expect(document.body.contains(form)).toBe(true);
    form.remove();
    expect(submitted).toBe(false); // submit happened inside submitPayuForm, before we stubbed it
  });

  it('refuses to post to anything but PayU', () => {
    expect(() => submitPayuForm({ action: 'https://evil.example/_payment', params: {} })).toThrow(/gateway/);
    expect(() => submitPayuForm({ action: '', params: {} })).toThrow(/gateway/);
  });

  it('reads and strips the return result from the query string', () => {
    expect(readReturnResult('?payment=abc&result=paid')).toEqual({ paymentId: 'abc', result: 'paid' });
    expect(readReturnResult('?result=invalid')).toEqual({ paymentId: '', result: 'invalid' });
    expect(readReturnResult('?tab=history')).toBeNull();
    expect(stripReturnResult('?payment=abc&result=paid&tab=history')).toBe('?tab=history');
    expect(stripReturnResult('?payment=abc&result=paid')).toBe('');
  });
});
