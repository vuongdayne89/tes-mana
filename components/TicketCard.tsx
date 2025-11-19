import React from 'react';
import { Ticket, TicketStatus } from '../types';
import { Calendar, Zap, Clock } from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onClick, selectable, selected }) => {
  const isExpired = new Date(ticket.expires_at) < new Date() || ticket.remaining_uses === 0;
  const isLocked = ticket.status === TicketStatus.LOCKED;
  
  const statusColor = isLocked ? 'bg-red-100 text-red-800' : isExpired ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800';
  const statusText = isLocked ? 'LOCKED' : isExpired ? 'EXPIRED' : 'ACTIVE';

  return (
    <div 
      onClick={!isLocked && !isExpired ? onClick : undefined}
      className={`
        relative p-4 rounded-xl border transition-all duration-200
        ${selectable && selected ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500' : 'border-gray-200 bg-white'}
        ${(isLocked || isExpired) ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{ticket.type.replace('-', ' ')}</span>
          <h3 className="font-bold text-lg text-gray-900">{ticket.ticket_id}</h3>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-bold ${statusColor}`}>
          {statusText}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center">
          <Zap size={16} className="mr-2 text-brand-500" />
          <span className="font-medium">
            {ticket.remaining_uses} / {ticket.total_uses} sessions left
          </span>
        </div>
        <div className="flex items-center">
          <Calendar size={16} className="mr-2 text-gray-400" />
          <span>Expires: {new Date(ticket.expires_at).toLocaleDateString()}</span>
        </div>
         <div className="flex items-center">
          <Clock size={16} className="mr-2 text-gray-400" />
          <span>Branch: {ticket.branch_id}</span>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;