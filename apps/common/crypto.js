import crypto from 'node:crypto'
const b64 = (s)=>Buffer.from(s).toString('base64')
const b = (s)=>Buffer.from(s,'base64')
function getKey(){
  const k = process.env.TOKPULSE_KMS_KEY || ''
  if (!k) throw new Error('TOKPULSE_KMS_KEY missing (base64 32 bytes)')
  const key = b(k)
  if (key.length !== 32) throw new Error('TOKPULSE_KMS_KEY must decode to 32 bytes')
  return key
}
export function encryptJSON(obj){
  const key = getKey(), iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(JSON.stringify(obj)), c.final()])
  const tag = c.getAuthTag()
  return {kver:1, iv:b64(iv), tag:b64(tag), data:b64(enc)}
}
export function decryptJSON(p){
  const key = getKey(), iv = b(p.iv), tag = b(p.tag)
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv); d.setAuthTag(tag)
  const dec = Buffer.concat([d.update(b(p.data)), d.final()])
  return JSON.parse(dec.toString())
}
