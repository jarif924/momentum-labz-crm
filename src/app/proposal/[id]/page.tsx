import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClientProposalView } from './ClientProposalView'

// Clients must always see the current version and acceptance status
export const dynamic = 'force-dynamic'

export default async function PublicProposalPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient()

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*, leads(contact_id, company_id, contacts(full_name, email), companies(name))')
    .eq('id', params.id)
    .single()

  if (error || !proposal) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-3xl">
        <ClientProposalView proposal={proposal} />
      </div>
    </div>
  )
}
