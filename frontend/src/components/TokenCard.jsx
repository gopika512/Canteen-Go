// Color config for each order status
const STATUS = {
  pending: {
    wrapper: 'bg-yellow-50 border-yellow-300',
    badge:   'bg-yellow-100 text-yellow-700',
    label:   'Waiting',
    icon:    '⏳',
  },
  preparing: {
    wrapper: 'bg-blue-50 border-blue-300',
    badge:   'bg-blue-100 text-blue-700',
    label:   'Preparing',
    icon:    '👨‍🍳',
    pulse:   true,
  },
  ready: {
    wrapper: 'bg-green-50 border-green-400',
    badge:   'bg-green-100 text-green-700',
    label:   'Ready for Pickup!',
    icon:    '✅',
    pulse:   true,
  },
  completed: {
    wrapper: 'bg-gray-50 border-gray-300',
    badge:   'bg-gray-100 text-gray-500',
    label:   'Completed',
    icon:    '🎉',
  },
};

function TokenCard({ order }) {
  const cfg = STATUS[order.status] || STATUS.pending;

  return (
    <div
      className={`border-2 rounded-2xl p-5 text-center animate-slideUp transition-all ${cfg.wrapper} ${
        cfg.pulse ? 'animate-pulse' : ''
      }`}
    >
      {/* Big token number */}
      <div className="text-5xl font-black text-gray-800 mb-1">#{order.token_number}</div>
      <div className="text-xs text-gray-500 font-medium mb-3 truncate px-2">{order.student_name}</div>

      {/* First 2 items */}
      <div className="text-xs text-gray-400 mb-3 space-y-0.5">
        {order.items?.slice(0, 2).map((item, i) => (
          <div key={i}>{item.quantity}× {item.item_name}</div>
        ))}
        {order.items?.length > 2 && (
          <div className="text-gray-300">+{order.items.length - 2} more</div>
        )}
      </div>

      {/* Status badge */}
      <span className={`inline-flex items-center gap-1.5 ${cfg.badge} text-xs font-semibold px-3 py-1.5 rounded-full`}>
        {cfg.icon} {cfg.label}
      </span>
    </div>
  );
}

export default TokenCard;