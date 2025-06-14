import { NextResponse } from 'next/server'

// Temporarily disabled - Stripe API route
export async function POST(req: Request) {
  return NextResponse.json(
    { error: 'Stripe API temporarily disabled' },
    { status: 503 }
  )
}

// import { cookies } from 'next/headers'
// import Stripe from 'stripe'
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
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
//     const { priceId } = body
//
//     if (!priceId) {
//       return NextResponse.json(
//         { error: 'Price ID is required' },
//         { status: 400 }
//       )
//     }
//
//     // Initialize Supabase client with cookies (after configuration check)
//     const supabase = createRouteHandlerClient({ cookies })
//
//     // Get the user from the session
//     const { data, error: sessionError } = await supabase.auth.getSession()
//     
//     if (sessionError) {
//       console.error('Session error:', sessionError)
//       return NextResponse.json(
//         { error: 'Authentication error' },
//         { status: 401 }
//       )
//     }
//
//     const session = data.session
//     if (!session?.user) {
//       console.error('No session or user found')
//       return NextResponse.json(
//         { error: 'Please log in to continue' },
//         { status: 401 }
//       )
//     }
//
//     const userId = session.user.id
//     const customerEmail = session.user.email
//
//     // Create or retrieve Stripe customer
//     const { data: existingCustomer } = await supabase
//       .from('customers')
//       .select('stripe_customer_id')
//       .eq('user_id', userId)
//       .single()
//
//     let customerId: string
//
//     if (existingCustomer?.stripe_customer_id) {
//       customerId = existingCustomer.stripe_customer_id
//     } else {
//       const customer = await stripe.customers.create({
//         email: customerEmail,
//         metadata: {
//           userId,
//         },
//       })
//       customerId = customer.id
//
//       await supabase.from('customers').insert({
//         user_id: userId,
//         stripe_customer_id: customerId,
//       })
//     }
//
//     // Create Stripe checkout session
//     const checkoutSession = await stripe.checkout.sessions.create({
//       customer: customerId,
//       line_items: [
//         {
//           price: priceId,
//           quantity: 1,
//         },
//       ],
//       mode: 'subscription',
//       success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
//       cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
//       metadata: {
//         userId,
//       },
//     })
//
//     return NextResponse.json({ url: checkoutSession.url })
//   } catch (err) {
//     console.error('Error creating checkout session:', err)
//     return NextResponse.json(
//       { error: 'Error creating checkout session' },
//       { status: 500 }
//     )
//   }
// } 