export type LicenseInfo = { license:string; pro:boolean; features?:string[]; expires?:string|null }
export async function fetchLicense(): Promise<LicenseInfo>{
  try{ const r = await fetch('/api/license',{cache:'no-store'}); if(!r.ok) throw 0; return await r.json() }
  catch{ return {license:'free', pro:false, features:['dashboard','support'], expires:null} }
}
