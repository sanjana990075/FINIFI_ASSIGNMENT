import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Loader from '../components/Loader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { getErrorMessage, getMatchStatus } from '../services/api.js';

function MatchPage() {
  const { poNumber: poParam } = useParams();
  const [poNumber, setPoNumber] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!poParam) {
      return;
    }

    const fetchMatch = async () => {
      setPoNumber(poParam);
      setMatchResult(null);
      setErrorMessage('');

      try {
        setLoading(true);
        const result = await getMatchStatus(poParam.trim());
        setMatchResult(result);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [poParam]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMatchResult(null);
    setErrorMessage('');

    if (!poNumber.trim()) {
      setErrorMessage('Please enter a PO number.');
      return;
    }

    try {
      setLoading(true);
      const result = await getMatchStatus(poNumber.trim());
      setMatchResult(result);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-grid page-match">
      {loading && <Loader />}
      <section className="card page-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Reconciliation lookup</p>
            <h1>Match Status</h1>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="poNumber">
            PO Number
          </label>
          <input
            id="poNumber"
            value={poNumber}
            onChange={(event) => setPoNumber(event.target.value)}
            className="input-field"
            placeholder="Enter PO number"
          />
          <button type="submit" className="primary-button">
            Check Match Status
          </button>
          {errorMessage && <div className="alert alert-error">{errorMessage}</div>}
        </form>

        {matchResult && (
          <div className="results-grid">
            <article className="status-card">
              <h2>Match Summary</h2>
              <div className="summary-row">
                <span className="summary-label">PO Number</span>
                <span>{matchResult.poNumber || 'N/A'}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Match Status</span>
                <StatusBadge status={matchResult.status} />
              </div>
            </article>

            <article className="status-card">
              <h2>Documents Found</h2>
              <div className="summary-row">
                <span className="summary-label">PO Count</span>
                <span>{matchResult.purchaseOrder ? 1 : 0}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">GRN Count</span>
                <span>{matchResult.grns?.length ?? 0}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Invoice Count</span>
                <span>{matchResult.invoices?.length ?? 0}</span>
              </div>
            </article>

            <article className="status-card mismatch-card">
              <h2>Mismatch Reasons</h2>
              {matchResult.mismatchReasons?.length > 0 ? (
                <div className="badge-list">
                  {matchResult.mismatchReasons.map((reason) => (
                    <span key={reason} className="reason-badge">
                      {reason.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted-text">No mismatch reasons found.</p>
              )}
            </article>
          </div>
        )}
      </section>
    </div>
  );
}

export default MatchPage;
