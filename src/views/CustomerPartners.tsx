import { Directory } from '@/views/Directory'
import type { CustomerUser } from '@/data/types'

export function CustomerPartners({ activeUser }: { activeUser?: CustomerUser }) {
  return <Directory activeUser={activeUser} />
}
