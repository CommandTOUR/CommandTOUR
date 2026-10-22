import { redirect } from 'next/navigation'

export default async function NewEventRedirect({ params }) {
  const { id } = await params
  redirect(`/tours/${id}`)
}
