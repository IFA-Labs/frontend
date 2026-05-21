'use client';

import { FormEvent, useState } from 'react';
import apiService from '@/lib/api';
import StartBuilding from '../start-building';
const blockchainOptions = [
  'Ethereum Mainnet',
  'Base Mainnet',
  'Arbitrum Mainnet',
  'BNB Chain Mainnet',
  'Polygon Mainnet',
  'Other',
];

const RequestDataField = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const supportedBlockchain = String(
      formData.get('supportedBlockchain') || '',
    ).trim();
    const symbols = String(formData.get('symbols') || '')
      .split(',')
      .map((symbol) => symbol.trim())
      .filter(Boolean);

    setStatus('loading');
    setStatusMessage('');

    try {
      await apiService.submitFeedRequest({
        name: String(formData.get('name') || '').trim(),
        project_name: String(formData.get('projectName') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        supported_blockchains: supportedBlockchain ? [supportedBlockchain] : [],
        symbols,
        website: String(formData.get('website') || '').trim(),
        message: String(formData.get('message') || '').trim(),
      });

      event.currentTarget.reset();
      setStatus('success');
      setStatusMessage('Request sent. We will get back to you promptly.');
    } catch (error) {
      setStatus('error');
      setStatusMessage('Unable to send request right now. Please try again.');
    }
  };

  return (
    <section className="request-data-field-page">
      <div className="request-data-field-shell">
        <div className="request-data-field-heading">
          <h1>Request new data field</h1>
          <p>Send us a request and get a response promptly</p>
        </div>

        <form className="request-data-field-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="request-field">
              <span>Name</span>
              <input type="text" name="name" placeholder="Name" required />
            </label>

            <label className="request-field">
              <span>Project name</span>
              <input
                type="text"
                name="projectName"
                placeholder="Project name"
                required
              />
            </label>

            <label className="request-field">
              <span>E-mail</span>
              <input type="email" name="email" placeholder="E-mail" required />
            </label>

            <label className="request-field request-select-field">
              <span>Supported blockchain</span>
              <select name="supportedBlockchain" defaultValue="" required>
                <option value="" disabled>
                  Supported blockchain
                </option>
                {blockchainOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="request-field">
              <span>Website</span>
              <input type="url" name="website" placeholder="Website" />
            </label>

            <label className="request-field">
              <span>Symbols (Tickers)</span>
              <input
                type="text"
                name="symbols"
                placeholder="Symbols (Tickers)"
                required
              />
            </label>
          </div>

          <label className="request-field request-message-field">
            <span className="sr-only">Message</span>
            <textarea
              name="message"
              placeholder="Write Message"
              rows={6}
              required
            />
          </label>

          {statusMessage && (
            <p className={`request-status ${status}`}>{statusMessage}</p>
          )}

          <button
            type="submit"
            className="request-submit"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Sending...' : 'Get Update'}
          </button>
        </form>
      </div>

      <StartBuilding /> 
    </section>
  );
};

export default RequestDataField;
