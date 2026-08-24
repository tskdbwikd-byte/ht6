import React, { useEffect, useState } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import axios from 'axios'
import FilePreview from './FilePreview'

export default function Upload(){
  const [user, setUser] = useState(null)
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [material, setMaterial] = useState('pla')
  const [color, setColor] = useState('#ffffff')
  const [pickup, setPickup] = useState('campus')
  const [notes, setNotes] = useState('')
  const [estimate, setEstimate] = useState(null)
  const [thumbUrl, setThumbUrl] = useState(null)
  const [quoteId, setQuoteId] = useState(null)

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, u=>{
      setUser(u)
      if(u && u.email) setEmail(u.email)
    })
    return () => unsub()
  },[])

  // form no longer uploads or charges — only provides quotes

  async function getQuote(e){
    e && e.preventDefault()
    if(!file) return alert('Please select a 3D file to get a quote')
    try{
      const est = await axios.post('/api/estimate', { volumeGrams: 50, material })
      setEstimate(est.data.price)
      // save anonymous quote for later retrieval
      try{
        const payload = {
          email: email || null,
          phone: phone || null,
          fileName: file.name || '',
          material,
          notes,
          estimate: est.data.price,
        }
        const saved = await axios.post('/quotes', payload)
        if(saved && saved.data && saved.data.id) setQuoteId(saved.data.id)
      }catch(saveErr){
        console.warn('Could not save quote', saveErr?.message || saveErr)
      }
    }catch(err){
      console.error(err); alert('Estimate failed')
    }
  }

  return (
    <div style={{maxWidth:1100,margin:'24px auto',padding:20}}>
      <div className="signin-card">
        <h2 style={{marginTop:0}}>Get a quote and submit your print</h2>
        <p style={{color:'var(--muted)'}}>You don't need to sign in to get a quote — create an account later to manage orders. We only ask for an email so we can contact you about your order.</p>
        <form onSubmit={(e)=>e.preventDefault()}>
          <div style={{display:'grid',gridTemplateColumns:'1fr',gap:18,alignItems:'start'}}>
            <div>
              <div style={{marginBottom:12}}>
                <label>Name</label><br/>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={{width:'100%',padding:8}} />
              </div>
              <div style={{marginBottom:12}}>
                <label>Email</label><br/>
                <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email (we'll contact you)" style={{width:'100%',padding:8}} />
              </div>
              <div style={{marginBottom:12}}>
                <label>Phone (optional)</label><br/>
                <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="e.g. +1 647 555 0123" type="tel" style={{width:'100%',padding:8}} />
                <div style={{color:'var(--muted)',fontSize:13,marginTop:6}}>Optional — provide a phone number if you prefer SMS/phone updates.</div>
              </div>
              <div style={{marginBottom:12}}>
                <label>3D file (STL, STEP, 3MF, OBJ or ZIP)</label><br/>
                <input type="file" accept=".stl,.obj,.step,.stp,.3mf,.zip" onChange={e=>setFile(e.target.files[0])} />
                <div style={{color:'var(--muted)',fontSize:13,marginTop:8}}>Accepted: STL, STEP, 3MF, OBJ · Maximum 100 MB. Have multiple parts? Upload them together as a ZIP file.</div>
                {file && <div style={{marginTop:8}}><FilePreview file={file} width={480} height={240} /></div>}
              </div>
              <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:12}}>
                <div style={{flex:'1 1 200px'}}>
                  <label>Material</label><br/>
                  <select value={material} onChange={e=>setMaterial(e.target.value)} style={{width:'100%',padding:8}}>
                    <option value="pla">PLA</option>
                    <option value="petg">PETG</option>
                  </select>
                </div>
                <div style={{flex:'1 1 160px'}}>
                  <label>Color</label><br/>
                  <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{width:'100%',height:40}} />
                </div>
                <div style={{flex:'1 1 200px'}}>
                  <label>Pickup</label><br/>
                  <select value={pickup} onChange={e=>setPickup(e.target.value)} style={{width:'100%',padding:8}}>
                    <option value="campus">Pickup (GTA locations)</option>
                    <option value="mail">Mail delivery</option>
                  </select>
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <label>Notes</label><br/>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} style={{width:'100%',padding:8}} />
              </div>
            </div>
            <div>
              <div style={{padding:16,background:'rgba(0,0,0,0.03)',borderRadius:8,marginTop:6}}>
                <h4 style={{marginTop:0}}>Quote & actions</h4>
                <p style={{color:'var(--muted)'}}>Upload your file and click "Get quote" to preview pricing. Create an account later to manage orders.</p>
                <div style={{display:'flex',gap:8,marginTop:12}}>
                  <button className="btn primary" onClick={getQuote} type="button">Get quote</button>
                </div>
                {estimate && <div style={{marginTop:12}}>Estimated price: <strong>${estimate}</strong></div>}
                {quoteId && <div style={{marginTop:8,color:'var(--muted)'}}>Saved quote id: {quoteId}</div>}
                {thumbUrl && <div style={{marginTop:12}}><h4>Server thumbnail</h4><img src={thumbUrl} alt="thumb" style={{maxWidth:240,border:'1px solid #ddd'}} onError={(e)=>{e.target.style.display='none'}} /></div>}
                {!user && <div style={{marginTop:12}}><a href="/signin" className="btn ghost">Create account (after quote)</a></div>}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
