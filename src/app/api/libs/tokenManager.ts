import { createCipheriv, createDecipheriv, createHash } from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const SECRET_KEY = process.env.ENCRYPTION_SECRET
const FIXED_IV = process.env.ENCRYPTION_IV

export function encodeToken(token: string): string {
  if(!SECRET_KEY || !FIXED_IV) {
    throw new Error('Encryption secret or IV is not set in environment variables')
  }
  try {
    // Create 32-byte key from secret
    const key = createHash('sha256').update(SECRET_KEY).digest()
    
    // Create 16-byte IV from fixed value
    const iv = createHash('md5').update(FIXED_IV).digest()
    
    const cipher = createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(token, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return encrypted // Same token = same output in dev
  } catch (error) {
    console.error('Failed to encode token:', error)
    throw new Error('Token encoding failed')
  }
}

export function decodeToken(encodedToken: string): string {
  if(!SECRET_KEY || !FIXED_IV) {
    throw new Error('Encryption secret or IV is not set in environment variables')
  }
  try {
    const key = createHash('sha256').update(SECRET_KEY).digest()
    const iv = createHash('md5').update(FIXED_IV).digest()
    
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    let decrypted = decipher.update(encodedToken, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Failed to decode token:', error)
    return ''
  }
}