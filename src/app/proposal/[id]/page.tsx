import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { ClientProposalView } from './ClientProposalView'

export default async function PublicProposalPage({ params }: { params: { id: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
