// Token encoding API - handles server-side token encoding for security
import { NextRequest, NextResponse } from 'next/server'
import { encodeToken } from '../libs/tokenManager'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required and must be a string' },
        { status: 400 }
      )
    }

    if (token.trim().length === 0) {
      return NextResponse.json(
        { error: 'Token cannot be empty' },
        { status: 400 }
      )
    }

    console.log('🔐 Encoding token on server-side...')
    
    // Encode the token using server-side secret
    const encodedToken = encodeToken(token.trim())
    
    console.log('✅ Token encoded successfully')
    
    return NextResponse.json({
      success: true,
      encodedToken,
      message: 'Token encoded successfully'
    })

  } catch (error) {
    console.error('❌ Token encoding failed:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to encode token',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
