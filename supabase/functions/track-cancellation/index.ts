import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const requestData = await req.json()
    const { 
      cancellation_reason,
      subscription_id,
      plan_type,
      credits_remaining = 0,
      user_email,
      subscription_start_date,
      subscription_revenue,
      lifetime_value
    } = requestData

    if (!cancellation_reason || !subscription_id || !plan_type) {
      return new Response(
        JSON.stringify({ 
          error: 'Faltan campos requeridos: cancellation_reason, subscription_id, plan_type' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const validReasons = [
      'probando',
      'terminado',
      'no_uso',
      'pocos_creditos',
      'caro',
      'mal_resultado',
      'otra_herramienta',
      'otro'
    ]

    if (!validReasons.includes(cancellation_reason)) {
      return new Response(
        JSON.stringify({ 
          error: 'Motivo de cancelación inválido',
          valid_reasons: validReasons
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!['monthly', 'annual'].includes(plan_type)) {
      return new Response(
        JSON.stringify({ 
          error: 'plan_type debe ser "monthly" o "annual"'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { data, error } = await supabaseClient
      .from('cancellation_tracking')
      .insert({
        user_id: user.id,
        subscription_id,
        plan_type,
        cancellation_reason,
        credits_remaining: credits_remaining || 0,
        user_email: user_email || user.email,
        subscription_start_date,
        subscription_revenue,
        lifetime_value
      })
      .select()
      .single()

    if (error) {
      console.error('Error guardando tracking:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Error al guardar datos',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        tracking_id: data.id,
        message: 'Motivo de cancelación guardado correctamente'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error en track-cancellation:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
