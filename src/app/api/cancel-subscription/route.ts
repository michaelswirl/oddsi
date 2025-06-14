import { NextResponse } from 'next/server'

// Temporarily disabled - Stripe API route
export async function POST(req: Request) {
  return NextResponse.json(
    { error: 'Stripe API temporarily disabled' },
    { status: 503 }
  )
}

// import Stripe from 'stripe'
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
// import { cookies } from 'next/headers'
//
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2025-05-28.basil',
// })
//
// export async function POST(req: Request) {
//   try {
//     // Check if Supabase is properly configured
//     if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
//         !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
//         process.env.NEXT_PUBLIC_SUPABASE_URL === 'test' ||
//         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'test') {
//       return NextResponse.json(
//         { error: 'Supabase not configured' },
//         { status: 503 }
//       )
//     }
//
//     const body = await req.json()
//     const { subscriptionId } = body
//
//     // Only create Supabase client after configuration check
//     const supabase = createRouteHandlerClient({ cookies })
//
//     // Get the subscription from database
//     const { data: subscription } = await supabase
//       .from('customer_subscriptions')
//       .select('subscription_id')
//       .eq('id', subscriptionId)
//       .single()
//
//     if (!subscription) {
//       return NextResponse.json(
//         { error: 'Subscription not found' },
//         { status: 404 }
//       )
//     }
//
//     // Cancel the subscription at period end
//     await stripe.subscriptions.update(subscription.subscription_id, {
//       cancel_at_period_end: true,
//     })
//
//     // Update subscription in database
//     await supabase
//       .from('customer_subscriptions')
//       .update({
//         cancel_at_period_end: true,
//         updated_at: new Date().toISOString(),
//       })
//       .eq('id', subscriptionId)
//
//     return NextResponse.json({ success: true })
//   } catch (err) {
//     console.error('Error canceling subscription:', err)
//     return NextResponse.json(
//       { error: 'Error canceling subscription' },
//       { status: 500 }
//     )
//   }
// } 