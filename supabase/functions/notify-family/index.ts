import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) throw new Error('Thiếu phiên đăng nhập');

    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const admin = createClient(url, serviceKey);
    const { data: userData, error: userError } = await caller.auth.getUser();
    if (userError || !userData.user) throw new Error('Phiên đăng nhập không hợp lệ');

    const input = await request.json();
    const familyId = String(input.family_id ?? '');
    const title = String(input.title ?? '').slice(0, 120);
    const body = String(input.body ?? '').slice(0, 500);
    if (!familyId || !title || !body) throw new Error('Nội dung thông báo chưa đầy đủ');

    const { data: membership } = await admin
      .from('family_members')
      .select('family_id')
      .eq('family_id', familyId)
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (!membership) throw new Error('Bạn không thuộc gia đình này');

    const { data: tokens, error: tokenError } = await admin
      .from('push_tokens')
      .select('expo_push_token')
      .eq('family_id', familyId)
      .neq('user_id', userData.user.id)
      .eq('enabled', true);
    if (tokenError) throw tokenError;

    if (tokens?.length) {
      const messages = tokens.map(({ expo_push_token }) => ({
        to: expo_push_token,
        title,
        body,
        sound: 'default',
        priority: 'high',
        data: typeof input.data === 'object' ? input.data : {},
      }));
      const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!pushResponse.ok) throw new Error(`Expo Push trả về ${pushResponse.status}`);
    }

    return Response.json(
      { delivered_to: tokens?.length ?? 0 },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Lỗi không xác định' },
      { status: 400, headers: corsHeaders },
    );
  }
});
