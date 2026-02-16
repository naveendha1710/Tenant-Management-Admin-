import { supabase } from '@/lib/supabaseClient';

export async function generateTicketId(): Promise<string> {
  const today = new Date();
  const year = String(today.getFullYear()).slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const prefix = `RTP-${year}${month}`;

  const { data: tickets } = await supabase
    .from('maintenance_tickets')
    .select('ticket_number')
    .like('ticket_number', `${prefix}%`)
    .order('ticket_number', { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (tickets && tickets.length > 0) {
    const lastTicket = tickets[0].ticket_number;
    const lastNumber = parseInt(lastTicket.slice(-4));
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}
