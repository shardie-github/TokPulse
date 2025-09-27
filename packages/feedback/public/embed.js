(()=>{
  function render(el){
    const buy = el.getAttribute('data-buy-url') || ''
    const theme = (el.getAttribute('data-theme') || 'dark').toLowerCase()
    const plan = el.getAttribute('data-plan') || 'feedback-pro'
    const price = el.getAttribute('data-price') || '49'
    const currency = el.getAttribute('data-currency') || 'USD'
    const bg = theme==='dark'?'#0b1220':'#ffffff'
    const fg = theme==='dark'?'#e8eefc':'#111111'

    el.innerHTML = ''
    const wrapper = document.createElement('div')
    wrapper.style.cssText = `padding:12px;border:1px solid #1f2a44;border-radius:12px;background:${bg};color:${fg};max-width:420px;font-family:Inter,system-ui,Arial`
    wrapper.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong>${plan}</strong>
        <span>${price} ${currency}/mo</span>
      </div>
      <button id="hardonia-buy" style="width:100%;padding:12px;border:1px solid #333;border-radius:10px;background:#111;color:#fff">Buy now</button>
      <p style="opacity:.7;font-size:.85em;margin-top:6px">Powered by Hardonia</p>
    `
    el.appendChild(wrapper)

    const onBuy = async ()=>{
      const ref = new URLSearchParams(location.search).get('ref') || localStorage.getItem('ref')
      if (buy){
        const url = new URL(buy)
        if (ref) url.searchParams.set('ref', ref)
        location.href = url.toString()
      } else {
        const r = await fetch('/api/checkout/stripe', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ ref })})
        const d = await r.json()
        if (d.url) location.href = d.url
        else alert('Checkout unavailable.')
      }
    }
    wrapper.querySelector('#hardonia-buy').addEventListener('click', onBuy)
  }
  function boot(){ document.querySelectorAll('.hardonia-purchase-widget').forEach(render) }
  if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', boot) } else { boot() }
})();
