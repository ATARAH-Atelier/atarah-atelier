import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

type ResetPasswordPayload = {
  new_password?: string
  user_id?: string
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: corsHeaders,
    status,
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse(500, {
      error: 'Missing Supabase environment variables.',
    })
  }

  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse(401, { error: 'Missing bearer token.' })
  }

  const accessToken = authHeader.replace('Bearer ', '').trim()

  if (!accessToken) {
    return jsonResponse(401, { error: 'Invalid bearer token.' })
  }

  let payload: ResetPasswordPayload

  try {
    payload = await request.json()
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' })
  }

  const userId = payload.user_id?.trim()
  const newPassword = payload.new_password?.trim()

  if (!userId) {
    return jsonResponse(400, { error: 'user_id is required.' })
  }

  if (!newPassword || newPassword.length < 6) {
    return jsonResponse(400, {
      error: 'new_password is required and must have at least 6 characters.',
    })
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })

  const {
    data: { user: requester },
    error: requesterError,
  } = await userClient.auth.getUser()

  if (requesterError || !requester) {
    return jsonResponse(401, {
      error: 'Could not validate the caller session.',
      detail: requesterError?.message ?? null,
    })
  }

  const { data: profile, error: profileError } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', requester.id)
    .maybeSingle()

  if (profileError) {
    return jsonResponse(500, {
      error: 'Could not validate the caller role.',
      detail: profileError.message,
    })
  }

  if (profile?.role !== 'admin') {
    return jsonResponse(403, {
      error: 'Only admins can reset staff passwords.',
    })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data: targetUser, error: targetUserError } =
    await adminClient.auth.admin.getUserById(userId)

  if (targetUserError || !targetUser.user) {
    return jsonResponse(404, {
      error: 'User not found.',
      detail: targetUserError?.message ?? null,
    })
  }

  const { data: targetProfile, error: targetProfileError } = await adminClient
    .from('profiles')
    .select('role, full_name')
    .eq('id', userId)
    .maybeSingle()

  if (targetProfileError) {
    return jsonResponse(500, {
      error: 'Could not load target profile.',
      detail: targetProfileError.message,
    })
  }

  if (!targetProfile || (targetProfile.role !== 'seller' && targetProfile.role !== 'admin')) {
    return jsonResponse(400, {
      error: 'The selected user is not a staff account.',
    })
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (updateError) {
    return jsonResponse(500, {
      error: 'Could not update the password.',
      detail: updateError.message,
    })
  }

  return jsonResponse(200, {
    ok: true,
    message: 'Password updated successfully.',
    user: {
      id: userId,
      full_name: targetProfile.full_name ?? null,
      role: targetProfile.role,
    },
  })
})
