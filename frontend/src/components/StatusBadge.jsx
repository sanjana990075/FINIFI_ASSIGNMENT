function StatusBadge({ status }) {
  const mapping = {
    matched: { label: 'Matched', className: 'badge badge-green' },
    partially_matched: { label: 'Partially Matched', className: 'badge badge-orange' },
    mismatch: { label: 'Mismatch', className: 'badge badge-red' },
    insufficient_documents: { label: 'Insufficient Documents', className: 'badge badge-gray' },
  };

  const { label, className } = mapping[status] || {
    label: 'Unknown',
    className: 'badge badge-gray',
  };

  return <span className={className}>{label}</span>;
}

export default StatusBadge;
