import { createClient } from '@/lib/supabase/server'
import { LandingPage } from '@/components/landing/LandingPage'
import { Navbar } from '@/components/landing/Navbar'
import { PLAN_PET_LIMITS, PLAN_LETTER_LIMITS, PlanTier } from '@/lib/constants/plans'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoggedIn = !!user
  const userName = user?.user_metadata?.full_name || user?.email || undefined

  let defaultPetId: string | undefined
  let canAddPet = true
  let canWriteLetter = false

  if (user) {
    const { data: pets } = await supabase
      .from('pets')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const currentPetCount = pets?.length || 0
    if (pets && pets.length > 0) {
      defaultPetId = pets[0].id
    }

    // Check limits
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_tier, pet_limit, max_pets_allowed')
      .eq('id', user.id)
      .single()

    const tier = (userData?.subscription_tier || 'free').toLowerCase() as PlanTier
    const petLimit = PLAN_PET_LIMITS[tier] || 1
    const defaultLetterLimit = PLAN_LETTER_LIMITS[tier] || 0

    canAddPet = currentPetCount < petLimit
    canWriteLetter = defaultLetterLimit > 0
    if (defaultPetId && defaultLetterLimit > 0) {
      // Determine quota key: 'lifetime' for free, billing period date (YYYY-MM-DD) for paid
      let quotaKey: string | null = null
      if (tier === 'free') {
        quotaKey = new Date().toISOString().slice(0, 7) // 'YYYY-MM' calendar month
      } else {
        const { data: activeSub } = await supabase
          .from('subscriptions')
          .select('current_period_start')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .single()
        quotaKey = activeSub?.current_period_start
          ? new Date(activeSub.current_period_start).toISOString().slice(0, 10)
          : null
      }

      if (!quotaKey) {
        // No active billing period found — deny (RPC will also deny)
        canWriteLetter = false
      } else {
        const { data: quotaData } = await supabase
          .from('letter_quota')
          .select('letters_allowed, letters_sent')
          .eq('user_id', user.id)
          .eq('pet_id', defaultPetId)
          .eq('month', quotaKey)
          .single()

        if (quotaData) {
          canWriteLetter = quotaData.letters_allowed > (quotaData.letters_sent || 0)
        } else {
          // No quota record yet — optimistically allow (write page self-heal will create it)
          canWriteLetter = true
        }
      }
    }
  }

  return (
    <>
      <Navbar />
      <LandingPage
        isLoggedIn={isLoggedIn}
        userName={userName}
        defaultPetId={defaultPetId}
        canAddPet={canAddPet}
        canWriteLetter={canWriteLetter}
      />
    </>
  )
}
