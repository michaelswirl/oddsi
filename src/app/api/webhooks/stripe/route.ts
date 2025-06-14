import { NextResponse } from 'next/server'

// Temporarily disabled - Stripe webhook route
export async function POST(req: Request) {
  return NextResponse.json(
    { error: 'Stripe webhook temporarily disabled' },
    { status: 503 }
  )
}

// import { headers, cookies } from 'next/headers'
// import Stripe from 'stripe'
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
//
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2025-05-28.basil',
// })
//
// const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
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
//     const body = await req.text()
//     const headersList = await headers()
//     const signature = headersList.get('stripe-signature')
//
//     if (!signature) {
//       return NextResponse.json(
//         { error: 'Missing stripe-signature header' },
//         { status: 400 }
//       )
//     }
//
//     const event = stripe.webhooks.constructEvent(
//       body,
//       signature,
//       webhookSecret
//     )
//
//     // Only create Supabase client after configuration check
//     const supabase = createRouteHandlerClient({ cookies })
//
//     // Handle the event
//     switch (event.type) {
//       case 'checkout.session.completed': {
//         const session = event.data.object as Stripe.Checkout.Session
//
//         // Get the subscription
//         const subscription = await stripe.subscriptions.retrieve(
//           session.subscription as string
//         )
//
//         // Get billing periods from the first subscription item
//         const firstItem = subscription.items.data[0]
//
//         // Add subscription to database
//         await supabase.from('customer_subscriptions').insert({
//           user_id: session.metadata?.userId,
//           subscription_id: subscription.id,
//           status: subscription.status,
//           price_id: subscription.items.data[0].price.id,
//           quantity: subscription.items.data[0].quantity,
//           cancel_at_period_end: subscription.cancel_at_period_end,
//           cancel_at: subscription.cancel_at
//             ? new Date(subscription.cancel_at * 1000).toISOString()
//             : null,
//           canceled_at: subscription.canceled_at
//             ? new Date(subscription.canceled_at * 1000).toISOString()
//             : null,
//           current_period_start: new Date(
//             firstItem.current_period_start * 1000
//           ).toISOString(),
//           current_period_end: new Date(
//             firstItem.current_period_end * 1000
//           ).toISOString(),
//           created: new Date(subscription.created * 1000).toISOString(),
//           ended_at: subscription.ended_at
//             ? new Date(subscription.ended_at * 1000).toISOString()
//             : null,
//           trial_start: subscription.trial_start
//             ? new Date(subscription.trial_start * 1000).toISOString()
//             : null,
//           trial_end: subscription.trial_end
//             ? new Date(subscription.trial_end * 1000).toISOString()
//             : null,
//         })
//
//         break
//       }
//
//       case 'customer.subscription.updated': {
//         const subscription = event.data.object as Stripe.Subscription
//
//         // Get billing periods from the first subscription item
//         const firstItem = subscription.items.data[0]
//
//         // Update subscription in database
//         await supabase
//           .from('customer_subscriptions')
//           .update({
//             status: subscription.status,
//             cancel_at_period_end: subscription.cancel_at_period_end,
//             cancel_at: subscription.cancel_at
//               ? new Date(subscription.cancel_at * 1000).toISOString()
//               : null,
//             canceled_at: subscription.canceled_at
//               ? new Date(subscription.canceled_at * 1000).toISOString()
//               : null,
//             current_period_start: new Date(
//               firstItem.current_period_start * 1000
//             ).toISOString(),
//             current_period_end: new Date(
//               firstItem.current_period_end * 1000
//             ).toISOString(),
//             ended_at: subscription.ended_at
//               ? new Date(subscription.ended_at * 1000).toISOString()
//               : null,
//             trial_start: subscription.trial_start
//               ? new Date(subscription.trial_start * 1000).toISOString()
//               : null,
//             trial_end: subscription.trial_end
//               ? new Date(subscription.trial_end * 1000).toISOString()
//               : null,
//             updated_at: new Date().toISOString(),
//           })
//           .eq('subscription_id', subscription.id)
//
//         break
//       }
//
//       case 'customer.subscription.deleted': {
//         const subscription = event.data.object as Stripe.Subscription
//
//         // Get billing periods from the first subscription item
//         const firstItem = subscription.items.data[0]
//
//         // Update subscription in database
//         await supabase
//           .from('customer_subscriptions')
//           .update({
//             status: subscription.status,
//             cancel_at_period_end: subscription.cancel_at_period_end,
//             cancel_at: subscription.cancel_at
//               ? new Date(subscription.cancel_at * 1000).toISOString()
//               : null,
//             canceled_at: subscription.canceled_at
//               ? new Date(subscription.canceled_at * 1000).toISOString()
//               : null,
//             current_period_start: new Date(
//               firstItem.current_period_start * 1000
//             ).toISOString(),
//             current_period_end: new Date(
//               firstItem.current_period_end * 1000
//             ).toISOString(),
//             ended_at: subscription.ended_at
//               ? new Date(subscription.ended_at * 1000).toISOString()
//               : null,
//             updated_at: new Date().toISOString(),
//           })
//           .eq('subscription_id', subscription.id)
//
//         break
//       }
//     }
//
//     return NextResponse.json({ received: true })
//   } catch (err) {
//     console.error('Error processing webhook:', err)
//     return NextResponse.json(
//       { error: 'Error processing webhook' },
//       { status: 400 }
//     )
//   }
// } 