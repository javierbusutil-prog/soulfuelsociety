import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { post_id } = await req.json()

    if (!post_id) {
      return new Response(JSON.stringify({ error: 'post_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the post
    const { data: post } = await supabase
      .from('posts')
      .select('id, user_id, content')
      .eq('id', post_id)
      .single()

    if (!post) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if author is a coach
    const { data: authorRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', post.user_id)

    const isCoach = authorRoles?.some(r => r.role === 'admin' || r.role === 'pt_admin')
    if (isCoach) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Author is a coach' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get author name
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', post.user_id)
      .single()

    const authorName = authorProfile?.full_name || 'Someone'
    const firstName = authorName.split(' ')[0]

    // Get all coaches
    const { data: coaches } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'pt_admin'])

    if (!coaches || coaches.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const coachIds = [...new Set(coaches.map(c => c.user_id))]
    const results = []

    for (const coachId of coachIds) {
      // Check push preferences
      const { data: prefs } = await supabase
        .from('coach_notification_preferences')
        .select('push_enabled')
        .eq('coach_id', coachId)
        .maybeSingle()

      const pushEnabled = prefs?.push_enabled ?? true

      if (!pushEnabled) {
        results.push({ coach_id: coachId, push: 'disabled' })
        continue
      }

      // Get push tokens
      const { data: tokens } = await supabase
        .from('coach_push_tokens')
        .select('id, push_token, device_type')
        .eq('coach_id', coachId)

      if (!tokens || tokens.length === 0) {
        results.push({ coach_id: coachId, push: 'no_tokens' })
        continue
      }

      // Send push to each token
      for (const token of tokens) {
        try {
          // Web Push API - requires VAPID keys
          if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            results.push({ coach_id: coachId, push: 'no_vapid_keys' })
            continue
          }

          // For web push, we'd use the Web Push protocol here
          // This is a placeholder - actual implementation depends on push service
          results.push({ coach_id: coachId, token_id: token.id, push: 'attempted' })
        } catch (pushError) {
          // Remove invalid token
          await supabase
            .from('coach_push_tokens')
            .delete()
            .eq('id', token.id)

          results.push({ coach_id: coachId, token_id: token.id, push: 'failed_removed' })
        }
      }
    }

    return new Response(JSON.stringify({ sent: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
