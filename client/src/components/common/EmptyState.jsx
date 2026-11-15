export default function EmptyState({ icon: Icon, title, message, action }) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-white px-6 py-12 text-center">
        {Icon && (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
            <Icon className="h-6 w-6" />
          </span>
        )}
        <h2 className="mt-4 text-lg font-semibold text-ink">{title}</h2>
        {message && <p className="mt-1 max-w-sm text-muted">{message}</p>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    );
  }