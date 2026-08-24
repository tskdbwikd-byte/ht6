import React from 'react'

const items = [
  {q: 'What file types do you accept?', a: 'We accept STL, STEP, 3MF, OBJ files and ZIP archives containing multiple parts. Maximum file size is 100 MB.'},
  {q: 'Do I need an account to get a quote?', a: 'No — you can get a quote without signing in. Create an account afterwards to manage orders.'},
  {q: 'Where can I pick up my print?', a: 'Pickup locations are available across the GTA, including UofT. We also offer delivery for selected partners.'},
  {q: 'How are prices calculated?', a: 'Prices are estimated based on material and estimated print volume. For precise pricing we slice the model and calculate filament usage; contact us if you need a detailed quote.'},
]

export default function FAQ(){
  return (
    <main style={{maxWidth:900,margin:'24px auto',padding:20}}>
      <h2>FAQ</h2>
      <div style={{marginTop:12,display:'grid',gap:8}}>
        {items.map((it, idx)=> (
          <details key={idx}>
            <summary>{it.q}</summary>
            <p style={{marginTop:8,color:'var(--muted)'}}>{it.a}</p>
          </details>
        ))}
      </div>
    </main>
  )
}
